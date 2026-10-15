import { describe, expect, it, vi } from 'vitest';

import { ComputeWorkerClient, type ComputeWorkerLike } from '../client';
import type { ComputeWorkerEvent, ComputeWorkerRunRequest } from '../dto';

class FakeWorker implements ComputeWorkerLike {
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessageerror: ((event: MessageEvent<unknown>) => void) | null = null;
  readonly messages: unknown[] = [];
  terminated = false;

  postMessage(message: unknown): void {
    this.messages.push(message);
  }

  terminate(): void {
    this.terminated = true;
  }

  emit(event: ComputeWorkerEvent): void {
    this.onmessage?.({ data: event } as MessageEvent<unknown>);
  }
}

const request = (
  runId: string,
  sourceIds: string[],
): ComputeWorkerRunRequest => ({
  type: 'run',
  runId,
  input: 'input',
  options: null,
  sourceIds,
  locale: 'en-US',
  timezone: 'UTC',
  timezoneOffset: 0,
  timezoneMode: 'fixed',
});

const resultEvent = (runId: string, sourceId: string): ComputeWorkerEvent => ({
  type: 'source-result',
  runId,
  sourceId,
  boxes: [
    {
      name: sourceId,
      plaintextOutput: sourceId,
      options: null,
    },
  ],
});

describe('ComputeWorkerClient', () => {
  it('ignores stale and out-of-order events by run and source id', async () => {
    const worker = new FakeWorker();
    const client = new ComputeWorkerClient({ createWorker: () => worker });
    const first = client.run(request('run-1', ['a']));
    const second = client.run(request('run-2', ['b']));
    worker.emit({ type: 'source-start', runId: 'run-2', sourceId: 'b' });
    worker.emit(resultEvent('run-1', 'a'));
    worker.emit(resultEvent('run-2', 'b'));
    worker.emit({ type: 'finished', runId: 'run-2' });

    await expect(first.promise).resolves.toMatchObject({ cancelled: true });
    await expect(second.promise).resolves.toMatchObject({ cancelled: false });
    expect([...(await second.promise).results.keys()]).toEqual(['b']);
  });

  it('cancels a queued run before the next input gets its own worker', async () => {
    vi.useFakeTimers();
    try {
      const workers: FakeWorker[] = [];
      const client = new ComputeWorkerClient({
        createWorker: () => {
          const worker = new FakeWorker();
          workers.push(worker);
          return worker;
        },
        cancelGraceMs: 10,
      });

      const first = client.run(request('run-1', ['a']));
      const second = client.run(request('run-2', ['b']));

      expect(workers).toHaveLength(2);
      expect(workers[0].messages).toContainEqual({
        type: 'cancel',
        runId: 'run-1',
      });
      vi.advanceTimersByTime(10);
      expect(workers[0].terminated).toBe(true);

      workers[1].emit({ type: 'source-start', runId: 'run-2', sourceId: 'b' });
      workers[1].emit(resultEvent('run-2', 'b'));
      workers[1].emit({ type: 'finished', runId: 'run-2' });
      await expect(first.promise).resolves.toMatchObject({ cancelled: true });
      await expect(second.promise).resolves.toMatchObject({ cancelled: false });
    } finally {
      vi.useRealTimers();
    }
  });

  it('times out one source, terminates the worker, and resumes remaining sources', async () => {
    vi.useFakeTimers();
    try {
      const workers: FakeWorker[] = [];
      const client = new ComputeWorkerClient({
        createWorker: () => {
          const worker = new FakeWorker();
          workers.push(worker);
          return worker;
        },
        timeoutMs: 100,
      });
      const timeout = vi.fn();
      const run = client.run(request('run-1', ['slow', 'fast']), {
        onSourceTimeout: timeout,
      });
      workers[0].emit({
        type: 'source-start',
        runId: 'run-1',
        sourceId: 'slow',
      });
      vi.advanceTimersByTime(100);

      expect(timeout).toHaveBeenCalledWith('run-1', 'slow');
      expect(workers[0].terminated).toBe(true);
      expect(workers[1].messages[0]).toMatchObject({ sourceIds: ['fast'] });

      workers[1].emit({
        type: 'source-start',
        runId: 'run-1',
        sourceId: 'fast',
      });
      workers[1].emit(resultEvent('run-1', 'fast'));
      workers[1].emit({ type: 'finished', runId: 'run-1' });
      await expect(run.promise).resolves.toMatchObject({ cancelled: false });
    } finally {
      vi.useRealTimers();
    }
  });

  it('uses a separate loading timeout before the CPU timeout starts', async () => {
    vi.useFakeTimers();
    try {
      const workers: FakeWorker[] = [];
      const client = new ComputeWorkerClient({
        createWorker: () => {
          const worker = new FakeWorker();
          workers.push(worker);
          return worker;
        },
        timeoutMs: 10,
        loadTimeoutMs: 100,
        startupTimeoutMs: 100,
      });
      const loadTimeout = vi.fn();
      const run = client.run(request('run-1', ['slow-load', 'fast']), {
        onSourceLoadTimeout: loadTimeout,
      });

      workers[0].emit({
        type: 'source-load-start',
        runId: 'run-1',
        sourceId: 'slow-load',
      });
      vi.advanceTimersByTime(99);
      expect(loadTimeout).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(loadTimeout).toHaveBeenCalledWith('run-1', 'slow-load');
      expect(workers[0].terminated).toBe(true);
      expect(workers[1].messages[0]).toMatchObject({ sourceIds: ['fast'] });

      workers[1].emit({
        type: 'source-start',
        runId: 'run-1',
        sourceId: 'fast',
      });
      workers[1].emit(resultEvent('run-1', 'fast'));
      workers[1].emit({ type: 'finished', runId: 'run-1' });
      await expect(run.promise).resolves.toMatchObject({ cancelled: false });
    } finally {
      vi.useRealTimers();
    }
  });

  it('rejects once on a worker trap and creates a fresh worker for the next run', async () => {
    const workers: FakeWorker[] = [];
    const client = new ComputeWorkerClient({
      createWorker: () => {
        const worker = new FakeWorker();
        workers.push(worker);
        return worker;
      },
    });
    const failed = client.run(request('run-1', ['a']));
    workers[0].onerror?.(new ErrorEvent('error'));
    await expect(failed.promise).rejects.toThrow('Compute worker failed');

    const recovered = client.run(request('run-2', ['b']));
    expect(workers).toHaveLength(2);
    workers[1].emit({ type: 'source-start', runId: 'run-2', sourceId: 'b' });
    workers[1].emit(resultEvent('run-2', 'b'));
    workers[1].emit({ type: 'finished', runId: 'run-2' });
    await expect(recovered.promise).resolves.toMatchObject({
      cancelled: false,
    });
  });

  it('rejects a worker that never reaches source execution', async () => {
    vi.useFakeTimers();
    try {
      const worker = new FakeWorker();
      const client = new ComputeWorkerClient({
        createWorker: () => worker,
        startupTimeoutMs: 100,
      });
      const failure = vi.fn();
      const run = client.run(request('run-1', ['a']), { onFailure: failure });
      vi.advanceTimersByTime(100);

      await expect(run.promise).rejects.toThrow(
        'Compute worker startup timed out',
      );
      expect(failure).toHaveBeenCalledWith(
        'run-1',
        'Compute worker startup timed out.',
      );
      expect(worker.terminated).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
