import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { LocalAIClient, type WorkerPort } from '../client.js';
import { createEngine } from '../engine.js';
import { type AIRequest, type Command, LocalAIError, messagesFor, MODEL, validateRequest, type WorkerEvent } from '../protocol.js';
import { checkGPU, type Generator, type LoadedModel } from '../runtime.js';

class FakeWorker implements WorkerPort {
  onmessage: WorkerPort['onmessage'] = null;
  onerror: WorkerPort['onerror'] = null;
  onmessageerror: WorkerPort['onmessageerror'] = null;
  commands: Command[] = [];
  terminated = false;
  postMessage(command: Command) { this.commands.push(command); }
  terminate() { this.terminated = true; }
  emit(event: WorkerEvent) { this.onmessage?.({ data: event } as MessageEvent<WorkerEvent>); }
  get id() { return this.commands[this.commands.length - 1].id; }
}
const request = { input: 'hello', task: 'ask', language: 'zh-TW' } as const;
function setup() {
  const workers: FakeWorker[] = [];
  const client = new LocalAIClient(() => {
    const worker = new FakeWorker(); workers.push(worker); return worker;
  });
  const ready = () => {
    client.prepare();
    const worker = workers[workers.length - 1];
    worker.emit({ type: 'ready', id: worker.id });
    return worker;
  };
  return { client, workers, ready };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}
function fakeModel(tokenCount = 10) {
  const calls: Parameters<Generator>[] = [];
  const generator = Object.assign(async (...args: Parameters<Generator>) => {
    calls.push(args);
    return [{ generated_text: 'answer' }];
  }, {
    tokenizer: Object.assign(() => ({ input_ids: { size: tokenCount } }), {
      apply_chat_template: (messages: { content: string }[]) => JSON.stringify(messages),
    }),
  });
  const model: LoadedModel = { generator, streamer: () => null };
  return { model, calls };
}

describe('local AI client ownership', () => {
  it('does not create a Worker before explicit preparation', () => {
    const { client, workers } = setup();
    client.generate(request);
    assert.equal(workers.length, 0);
    assert.equal(client.getSnapshot().phase, 'idle');
  });
  it('coalesces repeated preparation and only admits one generation', () => {
    const { client, workers, ready } = setup();
    client.prepare(); client.prepare();
    assert.equal(workers.length, 1);
    const worker = ready();
    client.generate(request); client.generate(request);
    assert.deepEqual(worker.commands.map((command) => command.type), ['load', 'generate']);
    client.release();
  });
  it('snapshots inputs and replaces streamed text with the final answer', () => {
    const { client, ready } = setup(); const worker = ready();
    const input: AIRequest = { ...request }; client.generate(input); input.input = 'changed';
    const command = worker.commands[1];
    assert.equal(command.type === 'generate' && command.request.input, 'hello');
    worker.emit({ type: 'token', id: worker.id, text: 'partial' });
    assert.equal(client.getSnapshot().text, 'partial');
    worker.emit({ type: 'complete', id: worker.id, text: 'final' });
    assert.equal(client.getSnapshot().text, 'final');
    worker.emit({ type: 'token', id: worker.id, text: 'late' });
    assert.equal(client.getSnapshot().text, 'final');
    client.release();
  });
  it('terminates a downloading Worker and ignores its queued ready event', () => {
    const { client, workers } = setup(); client.prepare();
    const old = workers[0]; const queued = old.onmessage;
    client.stop(); client.prepare();
    queued?.({ data: { type: 'ready', id: old.id } } as MessageEvent<WorkerEvent>);
    assert.equal(old.terminated, true);
    assert.equal(client.getSnapshot().phase, 'loading');
    assert.equal(client.getSnapshot().ready, false);
    client.release();
  });
  it('keeps interrupted output but cannot generate on a terminated model', () => {
    const { client, ready } = setup(); const worker = ready();
    client.generate(request); worker.emit({ type: 'token', id: worker.id, text: 'partial' });
    const queued = worker.onmessage; const id = worker.id;
    client.stop(); client.generate(request);
    queued?.({ data: { type: 'complete', id, text: 'stale' } } as MessageEvent<WorkerEvent>);
    assert.equal(worker.terminated, true);
    assert.equal(client.getSnapshot().phase, 'stopped');
    assert.equal(client.getSnapshot().text, 'partial');
    assert.equal(worker.commands.length, 2);
  });
  it('ignores the previous request on a reused Worker', () => {
    const { client, ready } = setup(); const worker = ready();
    client.generate(request); const old = worker.id;
    worker.emit({ type: 'complete', id: old, text: 'first' });
    client.generate(request); worker.emit({ type: 'token', id: old, text: 'stale' });
    assert.equal(client.getSnapshot().text, '');
    client.release();
  });
  it('retains a healthy model after token validation failure', () => {
    const { client, ready } = setup(); const worker = ready(); client.generate(request);
    worker.emit({ type: 'error', id: worker.id, code: 'inputTooLong' });
    assert.equal(client.getSnapshot().ready, true);
    client.generate(request);
    assert.equal(client.getSnapshot().phase, 'generating');
    client.release();
  });
  it('rejects invalid input without sending it to a Worker', () => {
    const { client, ready } = setup(); const worker = ready();
    client.generate({ ...request, input: '  ' });
    assert.equal(client.getSnapshot().error, 'invalidInput');
    assert.equal(worker.commands.length, 1); client.release();
  });
  it('handles Worker construction and postMessage failures', () => {
    const a = new LocalAIClient(() => { throw new Error('private'); }); a.prepare();
    assert.equal(a.getSnapshot().error, 'worker');
    const worker = new FakeWorker(); worker.postMessage = () => { throw new Error('private'); };
    const b = new LocalAIClient(() => worker); b.prepare();
    assert.equal(b.getSnapshot().error, 'worker'); assert.equal(worker.terminated, true);
  });
  it('prevents raw Worker errors from bubbling and permits retry', () => {
    const { client, workers } = setup(); client.prepare(); let prevented = false;
    workers[0].onerror?.({ preventDefault: () => { prevented = true; } } as ErrorEvent);
    assert.equal(prevented, true); assert.equal(client.getSnapshot().error, 'worker');
    client.prepare(); assert.equal(workers.length, 2); client.release();
  });
  it('handles deserialization failure and restartable StrictMode cleanup', () => {
    const { client, workers } = setup(); client.prepare();
    workers[0].onmessageerror?.({} as MessageEvent);
    assert.equal(client.getSnapshot().error, 'worker');
    client.release(); client.release(); client.prepare();
    assert.equal(client.getSnapshot().phase, 'loading'); client.release();
  });
  it('terminates a timed-out operation', async () => {
    const worker = new FakeWorker();
    const client = new LocalAIClient(() => worker, async () => {}, { load: 0, generate: 0 });
    const finished = new Promise<void>((resolve) => {
      const unsubscribe = client.subscribe(() => {
        if (client.getSnapshot().error === 'timeout') { unsubscribe(); resolve(); }
      });
    });
    client.prepare(); await finished;
    assert.equal(worker.terminated, true);
    assert.equal(client.getSnapshot().ready, false);
  });
  it('stops before deleting cache and blocks generation during deletion', async () => {
    const worker = new FakeWorker(); const deletion = deferred<void>(); let deletes = 0;
    const client = new LocalAIClient(() => worker, () => {
      assert.equal(worker.terminated, true); ++deletes; return deletion.promise;
    });
    client.prepare(); worker.emit({ type: 'ready', id: worker.id });
    const pending = client.clearModel(); void client.clearModel(); client.prepare(); client.generate(request);
    assert.equal(client.getSnapshot().phase, 'deleting'); assert.equal(deletes, 1);
    assert.equal(worker.commands.length, 1);
    deletion.resolve(); await pending; assert.equal(client.getSnapshot().phase, 'idle');
  });
  it('does not let late deletion completion overwrite a new session', async () => {
    const deletion = deferred<void>(); const worker = new FakeWorker();
    const client = new LocalAIClient(() => worker, () => deletion.promise);
    const pending = client.clearModel(); client.release(); client.prepare();
    deletion.resolve(); await pending;
    assert.equal(client.getSnapshot().phase, 'loading'); client.release();
  });
  it('reports cache deletion failure without leaking its exception', async () => {
    const client = new LocalAIClient(() => new FakeWorker(), async () => { throw new Error('private'); });
    await client.clearModel(); assert.equal(client.getSnapshot().error, 'cache');
  });
});

describe('local AI engine and bounds', () => {
  it('uses allowlisted tasks/languages and keeps input in the user message', () => {
    for (const task of ['ask', 'translate', 'rewrite', 'summarize'] as const) {
      const messages = messagesFor({ ...request, task });
      assert.match(messages[0].content, /Traditional Chinese/);
      assert.deepEqual(messages[1], { role: 'user', content: 'hello' });
    }
  });
  it('rejects empty, unknown, and oversized requests', () => {
    for (const invalid of [{ ...request, input: '' }, { ...request, task: 'execute' }, { ...request, language: 'xx' }]) {
      assert.throws(() => validateRequest(invalid as typeof request), LocalAIError);
    }
    validateRequest({ ...request, input: 'a'.repeat(MODEL.maxInputChars) });
    assert.throws(() => validateRequest({ ...request, input: 'a'.repeat(MODEL.maxInputChars + 1) }), LocalAIError);
  });
  it('checks HTTPS, adapter availability and shader-f16', async () => {
    await assert.rejects(checkGPU(false), { code: 'insecure' });
    await assert.rejects(checkGPU(true), { code: 'unsupported' });
    await assert.rejects(checkGPU(true, { requestAdapter: async () => null }), { code: 'unsupported' });
    await assert.rejects(checkGPU(true, { requestAdapter: async () => ({ features: new Set() }) }), { code: 'fp16' });
    await checkGPU(true, { requestAdapter: async () => ({ features: new Set(['shader-f16']) }) });
  });
  it('loads once and rejects overlapping admission without another allocation', async () => {
    const events: WorkerEvent[] = []; const loading = deferred<LoadedModel>(); let loads = 0;
    const engine = createEngine((event) => events.push(event), () => { ++loads; return loading.promise; });
    const first = engine({ type: 'load', id: 1 }); await engine({ type: 'load', id: 2 });
    assert.equal(loads, 1); loading.resolve(fakeModel().model); await first;
    await engine({ type: 'load', id: 3 }); assert.equal(loads, 1);
    assert.deepEqual(events.map((event) => event.id), [1, 3]);
  });
  it('allows a failed load to be retried and sanitizes errors', async () => {
    const events: WorkerEvent[] = []; let loads = 0;
    const engine = createEngine((event) => events.push(event), async () => {
      if (++loads === 1) throw new Error('prompt secret'); return fakeModel().model;
    });
    await engine({ type: 'load', id: 1 }); await engine({ type: 'load', id: 2 });
    assert.deepEqual(events, [{ type: 'error', id: 1, code: 'load' }, { type: 'ready', id: 2 }]);
  });
  it('rejects a tokenized over-budget prompt before generation', async () => {
    const events: WorkerEvent[] = []; const { model, calls } = fakeModel(MODEL.maxPromptTokens + 1);
    const engine = createEngine((event) => events.push(event), async () => model);
    await engine({ type: 'load', id: 1 }); await engine({ type: 'generate', id: 2, request });
    assert.equal(calls.length, 0);
    assert.deepEqual(events[1], { type: 'error', id: 2, code: 'inputTooLong' });
  });
  it('admits the exact prompt limit and fixes output budgets and sampling', async () => {
    const events: WorkerEvent[] = []; const { model, calls } = fakeModel(MODEL.maxPromptTokens);
    const engine = createEngine((event) => events.push(event), async () => model);
    await engine({ type: 'load', id: 1 }); await engine({ type: 'generate', id: 2, request });
    assert.equal(calls[0][1].max_new_tokens, 256); assert.equal(calls[0][1].do_sample, false);
    assert.equal(calls[0][1].add_special_tokens, false); assert.equal(calls[0][1].return_full_text, false);
    assert.deepEqual(events[1], { type: 'complete', id: 2, text: 'answer' });
  });
});
