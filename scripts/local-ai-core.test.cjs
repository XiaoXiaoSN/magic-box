const assert = require('node:assert/strict');
const { test } = require('node:test');
const path = require('node:path');

const output = process.env.MAGIC_BOX_AI_TEST_DIR;
if (!output) throw new Error('Run node scripts/test-local-ai.cjs instead.');
const load = (name) => require(path.join(output, `${name}.js`));
const { LocalAIClient } = load('client');
const { LocalAIEngine } = load('engine');
const { LocalAIError } = load('types');
const { checkCapabilities } = load('capabilities');
const { buildMessages, checkTokenBudget } = load('tasks');
const { MODEL, MODEL_OPTIONS, MAX_INPUT_CHARS, MAX_NEW_TOKENS } = load('modelCatalog');
const privacy = load('privacy');
const request = () => ({ input: 'A private question', task: 'ask', language: 'zh-TW' });
const deferred = () => {
  let resolve;
  const promise = new Promise((yes) => { resolve = yes; });
  return { promise, resolve };
};

class FakeWorker {
  commands = [];
  terminated = false;
  onmessage = null;
  onerror = null;
  onmessageerror = null;
  postMessage(command) { this.commands.push(command); }
  terminate() { this.terminated = true; }
  emit(event) { this.onmessage?.({ data: event }); }
  reply(event) { this.emit({ id: this.commands.at(-1).id, ...event }); }
}

function setupClient(t, ready = false) {
  const workers = [];
  const client = new LocalAIClient(() => {
    const worker = new FakeWorker();
    workers.push(worker);
    return worker;
  });
  t.after(() => client.dispose());
  if (ready) {
    client.inspect();
    workers[0].reply({ type: 'available', info: { bytes: 500, cached: false } });
    client.prepare();
    workers[0].reply({ type: 'ready' });
  }
  return { client, workers };
}

function setupEngine() {
  const events = [];
  const calls = { load: 0, check: 0, tokenizer: 0, model: 0, generate: [], dispose: 0, metadata: [] };
  const options = { tokens: 20, bytes: 100, exists: true, cached: false, generation: null, modelError: null };
  class Interruptor {
    interrupted = false;
    interrupt() { this.interrupted = true; }
  }
  class Streamer {
    constructor(_tokenizer, config) { this.callback = config.callback_function; }
  }
  const tokenizer = {
    apply_chat_template(messages, config) {
      calls.template = { messages, config };
      return { input_ids: { dims: [1, options.tokens] } };
    },
  };
  const model = {
    async generate(config) {
      calls.generate.push(config);
      if (options.generation) return options.generation(config);
      config.streamer?.callback('answer');
    },
    async dispose() { calls.dispose++; },
  };
  const runtime = {
    ModelRegistry: {
      async get_pipeline_files(task, id, config) {
        assert.equal(task, 'text-generation');
        assert.equal(id, MODEL.id);
        assert.deepEqual(config, MODEL_OPTIONS);
        return ['config.json', 'onnx/model_q4f16.onnx'];
      },
      async get_file_metadata(id, file, config) {
        calls.metadata.push({ id, file, config });
        return { exists: options.exists, size: options.bytes };
      },
      async is_pipeline_cached() { return options.cached; },
    },
    AutoTokenizer: {
      async from_pretrained(_id, config) {
        assert.equal(config.revision, MODEL.revision);
        calls.tokenizer++;
        return tokenizer;
      }
    },
    AutoModelForCausalLM: {
      async from_pretrained(_id, config) {
        calls.model++;
        assert.equal(config.revision, MODEL.revision);
        assert.equal(config.device, 'webgpu');
        assert.equal(config.dtype, 'q4f16');
        if (options.modelError) throw options.modelError;
        config.progress_callback({ status: 'progress', file: 'model.onnx', progress: 150 });
        return model;
      }
    },
    TextStreamer: Streamer,
    InterruptableStoppingCriteria: Interruptor,
  };
  const engine = new LocalAIEngine(
    (event) => events.push(event),
    async () => { calls.check++; },
    async () => { calls.load++; return runtime; },
  );
  return { engine, events, calls, options, model, runtime };
}

// Main-thread lifecycle and isolation tests use explicit messages, not sleeps.
test('client is inert until explicit inspection and rejects unprepared generation', (t) => {
  const { client, workers } = setupClient(t);
  assert.equal(workers.length, 0);
  assert.equal(client.prepare(), false);
  assert.equal(client.generate(request()), false);
  assert.equal(client.inspect(), true);
  assert.equal(workers.length, 1);
});

test('duplicate inspect, prepare and generate cannot start concurrent work', (t) => {
  const { client, workers } = setupClient(t);
  client.inspect();
  assert.equal(client.inspect(), false);
  workers[0].reply({ type: 'available', info: { bytes: 500, cached: false } });
  client.prepare();
  assert.equal(client.prepare(), false);
  workers[0].reply({ type: 'ready' });
  client.generate(request());
  assert.equal(client.generate(request()), false);
  assert.equal(workers[0].commands.length, 3);
});

test('submitted input is a snapshot and late request IDs cannot mix output', (t) => {
  const { client, workers: [worker] } = setupClient(t, true);
  const input = request();
  client.generate(input);
  input.input = 'edited draft';
  const id = worker.commands.at(-1).id;
  worker.emit({ type: 'delta', id: id - 1, text: 'stale' });
  worker.emit({ type: 'delta', id, text: 'new' });
  worker.emit({ type: 'complete', id });
  worker.emit({ type: 'delta', id, text: 'late' });
  assert.equal(client.getSnapshot().submitted.input, 'A private question');
  assert.equal(client.getSnapshot().output, 'new');
});

test('cooperative cancel drops subsequent deltas and keeps the warm model', (t) => {
  const { client, workers: [worker] } = setupClient(t, true);
  client.generate(request());
  worker.reply({ type: 'delta', text: 'partial' });
  client.stop();
  assert.equal(worker.commands.at(-1).type, 'cancel');
  worker.reply({ type: 'delta', text: 'discard' });
  worker.reply({ type: 'cancelled' });
  assert.equal(client.getSnapshot().phase, 'stopped');
  assert.equal(client.getSnapshot().output, 'partial');
  assert.equal(client.getSnapshot().loaded, true);
});

test('a completion racing with cancel stays a partial stopped result', (t) => {
  const { client, workers: [worker] } = setupClient(t, true);
  client.generate(request());
  client.stop();
  worker.reply({ type: 'complete' });
  assert.equal(client.getSnapshot().phase, 'stopped');
});

test('unresponsive generation is terminated after the cancellation deadline', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { client, workers: [worker] } = setupClient(t, true);
  client.generate(request());
  client.stop();
  t.mock.timers.tick(1999);
  assert.equal(worker.terminated, false);
  t.mock.timers.tick(1);
  assert.equal(worker.terminated, true);
  assert.equal(client.getSnapshot().loaded, false);
  assert.equal(client.getSnapshot().phase, 'stopped');
});

test('stopping model loading terminates the worker and ignores its queued messages', (t) => {
  const { client, workers } = setupClient(t);
  client.inspect();
  workers[0].reply({ type: 'available', info: { bytes: 500, cached: false } });
  client.prepare();
  const oldHandler = workers[0].onmessage;
  const oldId = workers[0].commands.at(-1).id;
  client.stop();
  assert.equal(workers[0].terminated, true);
  client.prepare();
  oldHandler({ data: { type: 'ready', id: oldId } });
  assert.equal(client.getSnapshot().loaded, false);
  workers[1].reply({ type: 'ready' });
  assert.equal(client.getSnapshot().loaded, true);
});

test('inspection timeout terminates work and supports a fresh retry', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { client, workers } = setupClient(t);
  client.inspect();
  t.mock.timers.tick(60_000);
  assert.equal(workers[0].terminated, true);
  assert.equal(client.getSnapshot().error, 'timeout');
  assert.equal(client.inspect(), true);
  assert.equal(workers.length, 2);
});

test('input-limit errors retain the loaded model for a shorter retry', (t) => {
  const { client, workers: [worker] } = setupClient(t, true);
  client.generate(request());
  worker.reply({ type: 'error', code: 'inputLimit' });
  assert.equal(client.getSnapshot().loaded, true);
  assert.equal(worker.terminated, false);
  assert.equal(client.generate(request()), true);
});

test('runtime errors discard the poisoned worker rather than reusing it', (t) => {
  const { client, workers: [worker] } = setupClient(t, true);
  client.generate(request());
  worker.reply({ type: 'error', code: 'generation' });
  assert.equal(client.getSnapshot().loaded, false);
  assert.equal(worker.terminated, true);
  assert.equal(client.prepare(), true);
});

test('worker failures are sanitized and suppressed from default error reporting', (t) => {
  const { client, workers: [worker] } = setupClient(t, true);
  let prevented = false;
  worker.onerror({ message: 'secret', preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(client.getSnapshot().error, 'load');
  assert.equal(JSON.stringify(client.getSnapshot()).includes('secret'), false);
});

test('release preserves completed output while freeing GPU memory', (t) => {
  const { client, workers: [worker] } = setupClient(t, true);
  client.generate(request());
  worker.reply({ type: 'delta', text: 'finished' });
  worker.reply({ type: 'complete' });
  client.release();
  assert.equal(worker.terminated, true);
  assert.equal(client.getSnapshot().phase, 'complete');
  assert.equal(client.getSnapshot().output, 'finished');
  assert.equal(client.getSnapshot().loaded, false);
});

test('reset removes private input and output, subscribers can unsubscribe', (t) => {
  const { client } = setupClient(t, true);
  let calls = 0;
  const unsubscribe = client.subscribe(() => calls++);
  client.generate(request());
  assert.ok(calls > 0);
  unsubscribe();
  const before = calls;
  client.reset();
  assert.equal(calls, before);
  assert.equal(client.getSnapshot().submitted, null);
  assert.equal(client.getSnapshot().output, '');
});

test('worker-construction failure is recoverable and does not leave a busy state', (t) => {
  const client = new LocalAIClient(() => { throw new Error('unavailable'); });
  t.after(() => client.dispose());
  assert.equal(client.inspect(), false);
  assert.equal(client.getSnapshot().phase, 'error');
  assert.equal(client.getSnapshot().error, 'unsupported');
});

// Prompt and hardware boundaries.
test('task prompts preserve input as data and use the selected output language', () => {
  for (const task of ['ask', 'translate', 'rewrite', 'summarize']) {
    const messages = buildMessages({ ...request(), task });
    assert.equal(messages[0].role, 'system');
    assert.match(messages[0].content, /Traditional Chinese/);
    assert.deepEqual(messages[1], { role: 'user', content: 'A private question' });
  }
});

test('empty, oversized and prototype task/language requests are rejected', () => {
  for (const next of [{ input: '' }, { input: '  ' }, { task: 'constructor' }, { language: 'toString' }]) {
    assert.throws(() => buildMessages({ ...request(), ...next }), { code: 'invalidRequest' });
  }
  assert.throws(() => buildMessages({ ...request(), input: 'x'.repeat(MAX_INPUT_CHARS + 1) }), { code: 'inputLimit' });
});

test('token budget includes the complete template and does not silently truncate', () => {
  checkTokenBudget(1024);
  assert.throws(() => checkTokenBudget(1025), { code: 'inputLimit' });
  for (const count of [0, -1, NaN, Infinity, 2.5]) {
    assert.throws(() => checkTokenBudget(count), { code: 'invalidRequest' });
  }
});

test('GPU checks reject HTTP, absent/null adapters, missing f16 and adapter errors', async () => {
  await assert.rejects(checkCapabilities(false, undefined), { code: 'unsupported' });
  await assert.rejects(checkCapabilities(true, undefined), { code: 'unsupported' });
  await assert.rejects(checkCapabilities(true, { async requestAdapter() { return null; } }), { code: 'unsupported' });
  await assert.rejects(checkCapabilities(true, { async requestAdapter() { throw Error('driver'); } }), { code: 'unsupported' });
  await assert.rejects(checkCapabilities(true, { async requestAdapter() { return { features: new Set() }; } }), { code: 'unsupported' });
  await checkCapabilities(true, { async requestAdapter() { return { features: new Set(['shader-f16']) }; } });
});

// Worker engine tests inject a fake runtime. No weights or remote code are loaded.
test('inspection fetches pinned metadata only, never tokenizer or weights', async () => {
  const { engine, events, calls } = setupEngine();
  await engine.handle({ type: 'inspect', id: 1 });
  assert.deepEqual(events, [{ type: 'available', id: 1, info: { bytes: 200, cached: false } }]);
  assert.equal(calls.model, 0);
  assert.equal(calls.tokenizer, 0);
  assert.ok(calls.metadata.every(({ config }) => config.revision === MODEL.revision));
});

test('unknown metadata size is an error rather than misleading zero download size', async () => {
  const { engine, events, options } = setupEngine();
  options.bytes = null;
  await engine.handle({ type: 'inspect', id: 1 });
  assert.deepEqual(events, [{ type: 'error', id: 1, code: 'metadata' }]);
});

test('preparation is single-flight and ready requires a successful warm-up', async () => {
  const { engine, events, calls, options } = setupEngine();
  const entered = deferred();
  const resume = deferred();
  options.generation = async () => { entered.resolve(); await resume.promise; };
  const preparation = engine.handle({ type: 'prepare', id: 1 });
  await entered.promise;
  await engine.handle({ type: 'prepare', id: 2 });
  assert.equal(events.some(({ type }) => type === 'ready'), false);
  assert.equal(calls.model, 1);
  resume.resolve();
  await preparation;
  assert.deepEqual(events.at(-1), { type: 'ready', id: 1 });
  assert.equal(calls.generate[0].max_new_tokens, 1);
  assert.equal(events.find(({ type }) => type === 'progress').progress, 100);
  await engine.handle({ type: 'prepare', id: 3 });
  assert.equal(calls.model, 1);
});

test('failed warm-up disposes the model and exposes no raw error text', async () => {
  const { engine, events, calls, options } = setupEngine();
  options.generation = async () => { throw Error('private text'); };
  await engine.handle({ type: 'prepare', id: 1 });
  assert.equal(calls.dispose, 1);
  assert.deepEqual(events.at(-1), { type: 'error', id: 1, code: 'load' });
  assert.equal(JSON.stringify(events).includes('private text'), false);
});

test('generation without preparation does not download a model', async () => {
  const { engine, events, calls } = setupEngine();
  await engine.handle({ type: 'generate', id: 1, request: request() });
  assert.equal(calls.load, 0);
  assert.equal(calls.model, 0);
  assert.deepEqual(events, [{ type: 'error', id: 1, code: 'load' }]);
});

test('generation streams only new text, enforces output budget and uses chat template', async () => {
  const { engine, events, calls } = setupEngine();
  await engine.handle({ type: 'prepare', id: 1 });
  await engine.handle({ type: 'generate', id: 2, request: request() });
  assert.deepEqual(events.slice(-2), [{ type: 'delta', id: 2, text: 'answer' }, { type: 'complete', id: 2 }]);
  assert.equal(calls.generate.at(-1).max_new_tokens, MAX_NEW_TOKENS);
  assert.equal(calls.generate.at(-1).do_sample, false);
  assert.equal(calls.template.config.add_generation_prompt, true);
  assert.equal(calls.template.config.return_dict, true);
});

test('oversized tokenized prompt is rejected before calling generate', async () => {
  const { engine, events, calls, options } = setupEngine();
  await engine.handle({ type: 'prepare', id: 1 });
  options.tokens = 1025;
  await engine.handle({ type: 'generate', id: 2, request: request() });
  assert.equal(calls.generate.length, 1); // warm-up only
  assert.deepEqual(events.at(-1), { type: 'error', id: 2, code: 'inputLimit' });
});

test('cancellation reaches in-flight generation without queuing behind it', async () => {
  const { engine, events, options } = setupEngine();
  await engine.handle({ type: 'prepare', id: 1 });
  const entered = deferred();
  const resume = deferred();
  let config;
  options.generation = async (value) => {
    config = value;
    value.streamer.callback('before');
    entered.resolve();
    await resume.promise;
    value.streamer.callback('after');
  };
  const generation = engine.handle({ type: 'generate', id: 2, request: request() });
  await entered.promise;
  await engine.handle({ type: 'cancel', id: 100 });
  assert.equal(config.stopping_criteria[0].interrupted, false);
  await engine.handle({ type: 'cancel', id: 2 });
  assert.equal(config.stopping_criteria[0].interrupted, true);
  resume.resolve();
  await generation;
  assert.deepEqual(events.filter(({ type }) => type === 'delta'), [{ type: 'delta', id: 2, text: 'before' }]);
  assert.deepEqual(events.at(-1), { type: 'cancelled', id: 2 });
});

test('storage quota exceptions are mapped to an actionable sanitized error', async () => {
  const { engine, events, options } = setupEngine();
  options.modelError = Object.assign(new Error('disk contents'), { name: 'QuotaExceededError' });
  await engine.handle({ type: 'prepare', id: 1 });
  assert.deepEqual(events.at(-1), { type: 'error', id: 1, code: 'storage' });
});

test('privacy activation is sticky and notifies only subscribed listeners once', () => {
  assert.equal(privacy.isLocalAIMode('?mode=local-ai&input=ignored'), true);
  assert.equal(privacy.isLocalAIMode('?mode=tools'), false);
  let notifications = 0;
  let removed = 0;
  privacy.subscribeLocalAIPrivacy(() => notifications++);
  const unsubscribe = privacy.subscribeLocalAIPrivacy(() => removed++);
  unsubscribe();
  privacy.activateLocalAIPrivacy();
  privacy.activateLocalAIPrivacy();
  assert.equal(privacy.isLocalAIPrivate(), true);
  assert.equal(notifications, 1);
  assert.equal(removed, 0);
});
