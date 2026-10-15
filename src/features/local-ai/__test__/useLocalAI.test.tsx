import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { LocalAIClient, WorkerPort } from '../client';
import { LocalAIModelOwnership } from '../ownership';
import { useLocalAI } from '../useLocalAI';
import { FakeWorker } from './fakeWorker';

class TestBroadcastChannel {
  static channels = new Set<TestBroadcastChannel>();
  onmessage: ((event: MessageEvent) => void) | null = null;

  constructor(_name: string) {
    TestBroadcastChannel.channels.add(this);
  }

  postMessage(data: unknown): void {
    for (const channel of TestBroadcastChannel.channels) {
      if (channel === this) continue;
      queueMicrotask(() => channel.onmessage?.({ data } as MessageEvent));
    }
  }

  close(): void {
    TestBroadcastChannel.channels.delete(this);
  }
}

interface WaitingLock {
  callback: (lock: Lock | null) => Promise<void>;
  reject: (error: Error) => void;
  resolve: () => void;
  signal: AbortSignal | null;
}

const createLocks = (): LockManager => {
  let held = false;
  const waiting: WaitingLock[] = [];

  const run = (request: WaitingLock): void => {
    held = true;
    void request
      .callback({} as Lock)
      .then(request.resolve, request.reject)
      .finally(() => {
        held = false;
        const next = waiting.shift();
        if (next) run(next);
      });
  };

  return {
    request: (
      _name: string,
      options: LockOptions,
      callback: (lock: Lock | null) => Promise<void>,
    ): Promise<void> => {
      if (options.ifAvailable && held) return callback(null);
      return new Promise<void>((resolve, reject) => {
        const request: WaitingLock = {
          callback,
          reject,
          resolve,
          signal: options.signal ?? null,
        };
        if (!held) {
          run(request);
          return;
        }
        const cancel = (): void => {
          const index = waiting.indexOf(request);
          if (index >= 0) waiting.splice(index, 1);
          reject(new DOMException('Aborted', 'AbortError'));
        };
        if (request.signal?.aborted) {
          cancel();
          return;
        }
        request.signal?.addEventListener('abort', cancel, { once: true });
        waiting.push(request);
      });
    },
    query: async () => ({ held: [], pending: [] }),
  } as unknown as LockManager;
};

interface HarnessProps {
  createWorker: () => WorkerPort;
  onClient: (client: LocalAIClient) => void;
}

const Harness = ({ createWorker, onClient }: HarnessProps): null => {
  const { client } = useLocalAI({
    createWorker,
    createOwnership: () => new LocalAIModelOwnership(),
  });
  onClient(client);
  return null;
};

const setHidden = (hidden: boolean): void => {
  Object.defineProperty(document, 'hidden', {
    configurable: true,
    value: hidden,
  });
};

const flushLocks = async (): Promise<void> => {
  await act(async () => {
    for (let i = 0; i < 8; i += 1) await Promise.resolve();
  });
};

interface ClientHarness {
  client: LocalAIClient;
  createWorker: () => WorkerPort;
  workers: FakeWorker[];
}

const createClientHarness = (): ClientHarness => {
  const workers: FakeWorker[] = [];
  let client: LocalAIClient | null = null;
  return {
    get client() {
      if (!client) throw new Error('client not mounted');
      return client;
    },
    createWorker: () => {
      const worker = new FakeWorker();
      workers.push(worker);
      return worker;
    },
    workers,
    set client(value: LocalAIClient) {
      client = value;
    },
  };
};

const mountHarness = (harness: ClientHarness): React.JSX.Element => (
  <Harness
    createWorker={harness.createWorker}
    onClient={(client) => {
      harness.client = client;
    }}
  />
);

const inspectCached = (harness: ClientHarness): void => {
  act(() => {
    harness.client.inspect();
    harness.workers.at(-1)?.reply({
      type: 'available',
      info: { bytes: 500, cached: true },
    });
  });
};

const loadCached = async (harness: ClientHarness): Promise<void> => {
  inspectCached(harness);
  act(() => {
    harness.client.prepare({ cacheOnly: true });
  });
  await flushLocks();
  act(() => {
    harness.workers.at(-1)?.reply({ type: 'ready', cached: true });
  });
};

const prepareContendedPair = async (): Promise<{
  owner: ClientHarness;
  waiting: ClientHarness;
  view: ReturnType<typeof render>;
}> => {
  const owner = createClientHarness();
  const waiting = createClientHarness();
  const view = render(
    <>
      {mountHarness(owner)}
      {mountHarness(waiting)}
    </>,
  );

  await loadCached(waiting);
  act(() => waiting.client.release());
  await flushLocks();
  await loadCached(owner);

  act(() => {
    fireEvent(document, new Event('visibilitychange'));
  });
  await flushLocks();
  expect(waiting.client.getSnapshot().phase).toBe('loading');
  expect(waiting.workers).toHaveLength(1);
  return { owner, waiting, view };
};

describe('useLocalAI cross-tab lifecycle', () => {
  const previousHidden = Object.getOwnPropertyDescriptor(document, 'hidden');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('navigator', { locks: createLocks() });
    vi.stubGlobal(
      'BroadcastChannel',
      TestBroadcastChannel as unknown as typeof BroadcastChannel,
    );
    setHidden(false);
  });

  afterEach(async () => {
    cleanup();
    act(() => vi.runOnlyPendingTimers());
    await flushLocks();
    TestBroadcastChannel.channels.clear();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    if (previousHidden) {
      Object.defineProperty(document, 'hidden', previousHidden);
    } else {
      Reflect.deleteProperty(document, 'hidden');
    }
  });

  it('waits for the prior tab to release, then reloads the verified cache once', async () => {
    const { owner, waiting } = await prepareContendedPair();

    act(() => owner.client.release());
    await flushLocks();

    expect(waiting.workers).toHaveLength(2);
    expect(waiting.workers[1].commands).toEqual([
      { type: 'prepare', id: 3, cacheOnly: true },
    ]);
    await flushLocks();
    expect(waiting.workers[1].commands).toHaveLength(1);
  });

  it('cancels a queued reload when the tab becomes hidden', async () => {
    const { owner, waiting } = await prepareContendedPair();

    setHidden(true);
    act(() => fireEvent(document, new Event('visibilitychange')));
    act(() => owner.client.release());
    await flushLocks();

    expect(waiting.client.getSnapshot().phase).toBe('available');
    expect(waiting.workers).toHaveLength(1);
  });

  it('cancels a queued reload when its final surface unmounts', async () => {
    const { owner, waiting, view } = await prepareContendedPair();

    view.rerender(mountHarness(owner));
    act(() => owner.client.release());
    await flushLocks();

    expect(waiting.client.getSnapshot().phase).toBe('available');
    expect(waiting.workers).toHaveLength(1);
  });

  it('invalidates every peer after successful deletion without restarting a queued model', async () => {
    const { owner, waiting, view } = await prepareContendedPair();
    const idle = createClientHarness();
    view.rerender(
      <>
        {mountHarness(owner)}
        {mountHarness(waiting)}
        {mountHarness(idle)}
      </>,
    );
    inspectCached(idle);

    const leasePromise = waiting.client.acquireDeletionLease();
    await flushLocks();
    act(() => vi.advanceTimersByTime(100));
    await flushLocks();
    const releaseLease = await leasePromise;
    expect(releaseLease).toEqual(expect.any(Function));

    act(() => waiting.client.cacheDeletionSucceeded());
    await flushLocks();

    expect(owner.client.getSnapshot().info?.cached).toBe(false);
    expect(waiting.client.getSnapshot().info?.cached).toBe(false);
    expect(idle.client.getSnapshot().info?.cached).toBe(false);
    expect(waiting.workers).toHaveLength(1);
    act(() => releaseLease?.());
  });
});
