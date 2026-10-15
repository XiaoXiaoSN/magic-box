import { afterEach, describe, expect, it, vi } from 'vitest';

import { LocalAIEngine } from '../engine';
import { MAX_NEW_TOKENS, MAX_PROMPT_TOKENS, MODEL } from '../modelCatalog';
import type { Logits } from '../repetition';
import type { RuntimeProgress, TransformersRuntime } from '../runtime';
import type { AIEvent } from '../types';

interface Options {
  tokens: number;
  cached: boolean;
  cacheError: Error | null;
  modelError: Error | null;
  generate: ((config: Record<string, unknown>) => Promise<void>) | null;
  cacheResults: boolean[];
}

const setupEngine = () => {
  const events: AIEvent[] = [];
  const calls = {
    load: 0,
    check: 0,
    tokenizer: 0,
    model: 0,
    dispose: 0,
    cacheChecks: 0,
    localFilesOnly: [] as boolean[],
    generate: [] as Record<string, unknown>[],
    template: null as { messages: unknown; config: unknown } | null,
  };
  const options: Options = {
    tokens: 20,
    cached: false,
    cacheError: null,
    modelError: null,
    generate: null,
    cacheResults: [],
  };
  const stoppingCriteria: { interrupted: boolean }[] = [];

  class Interruptor {
    interrupted = false;
    constructor() {
      stoppingCriteria.push(this);
    }
    interrupt() {
      this.interrupted = true;
    }
  }
  class Streamer {
    callback: (text: string) => void;
    constructor(
      _tokenizer: unknown,
      config: { callback_function: (text: string) => void },
    ) {
      this.callback = config.callback_function;
    }
  }

  const tokenizer = {
    apply_chat_template(messages: unknown, config: unknown) {
      calls.template = { messages, config };
      return { input_ids: { dims: [1, options.tokens] } };
    },
  };
  const model = {
    async generate(config: Record<string, unknown>) {
      calls.generate.push(config);
      if (options.generate) return options.generate(config);
      const processors = config.logits_processor as
        | ((inputIds: bigint[][], logits: Logits) => Logits)[]
        | undefined;
      for (let count = 1; count <= 3; count++) {
        processors?.[0]([new Array(options.tokens + count - 1).fill(0n)], {
          0: { data: new Float32Array(8).fill(1) },
        });
      }
      (config.streamer as Streamer | undefined)?.callback('answer');
    },
    async dispose() {
      calls.dispose++;
    },
  };
  const runtime = {
    ModelRegistry: {
      async is_pipeline_cached() {
        throw new Error('Inspection must not enter the upstream registry');
      },
    },
    AutoTokenizer: {
      async from_pretrained(
        _id: string,
        config: {
          revision: string;
          local_files_only: boolean;
          progress_callback: (event: RuntimeProgress) => void;
        },
      ) {
        expect(config.revision).toBe(MODEL.revision);
        calls.localFilesOnly.push(config.local_files_only);
        calls.tokenizer++;
        // Tokenizer files have no aggregate: a sign of life, no percentage.
        config.progress_callback({ status: 'progress', progress: 30 });
        return tokenizer;
      },
    },
    AutoModelForCausalLM: {
      async from_pretrained(
        _id: string,
        config: {
          revision: string;
          device: string;
          dtype: string;
          local_files_only: boolean;
          progress_callback: (event: RuntimeProgress) => void;
        },
      ) {
        calls.model++;
        calls.localFilesOnly.push(config.local_files_only);
        expect(config).toMatchObject({
          revision: MODEL.revision,
          device: 'webgpu',
          dtype: 'q4f16',
          local_files_only: expect.any(Boolean),
        });
        if (options.modelError) throw options.modelError;
        // Only the aggregate is forwarded, and out-of-range values are
        // clamped. The per-file event the default wrapper emits right after
        // it would make the bar alternate between two percentages.
        config.progress_callback({ status: 'progress_total', progress: 150 });
        config.progress_callback({ status: 'progress', progress: 7 });
        config.progress_callback({ status: 'initiate' });
        return model;
      },
    },
    TextStreamer: Streamer,
    InterruptableStoppingCriteria: Interruptor,
  } as unknown as TransformersRuntime;

  const engine = new LocalAIEngine(
    (event) => events.push(event),
    async () => {
      calls.check++;
    },
    async () => {
      calls.load++;
      return runtime;
    },
    async () => {
      calls.cacheChecks++;
      if (options.cacheError) throw options.cacheError;
      if (options.cacheResults.length)
        return options.cacheResults.shift() ?? false;
      return options.cached;
    },
  );
  return { engine, events, calls, options, stoppingCriteria };
};

const prepared = async (setup: ReturnType<typeof setupEngine>) => {
  await setup.engine.handle({ type: 'prepare', id: 1, cacheOnly: false });
  setup.events.length = 0;
  setup.calls.generate.length = 0;
  return setup;
};

afterEach(() => vi.restoreAllMocks());

describe('local AI engine', () => {
  it('inspects the pinned size and local cache only, never tokenizer or weights', async () => {
    const setup = setupEngine();
    await setup.engine.handle({ type: 'inspect', id: 7 });
    expect(setup.events).toEqual([
      {
        type: 'available',
        id: 7,
        info: { bytes: MODEL.downloadBytes, cached: false },
      },
    ]);
    expect(setup.calls.cacheChecks).toBe(1);
    expect(setup.calls.tokenizer).toBe(0);
    expect(setup.calls.model).toBe(0);
    expect(setup.calls.check).toBe(1);
  });

  it('reports a complete cache without invoking the upstream registry', async () => {
    const setup = setupEngine();
    setup.options.cached = true;
    await setup.engine.handle({ type: 'inspect', id: 8 });
    expect(setup.events).toEqual([
      {
        type: 'available',
        id: 8,
        info: { bytes: MODEL.downloadBytes, cached: true },
      },
    ]);
    expect(setup.calls.cacheChecks).toBe(1);
    expect(setup.calls.tokenizer).toBe(0);
    expect(setup.calls.model).toBe(0);
  });

  it('refuses a cache-only prepare when a previously cached model was evicted', async () => {
    const setup = setupEngine();
    setup.options.cacheResults = [false];
    await setup.engine.handle({ type: 'prepare', id: 9, cacheOnly: true });
    expect(setup.events).toEqual([
      {
        type: 'available',
        id: 9,
        info: { bytes: MODEL.downloadBytes, cached: false },
      },
    ]);
    expect(setup.calls.tokenizer).toBe(0);
    expect(setup.calls.model).toBe(0);
  });

  it('reports the post-load cache verification rather than assuming ready means cached', async () => {
    const setup = setupEngine();
    setup.options.cacheResults = [true, false];
    await setup.engine.handle({ type: 'prepare', id: 10, cacheOnly: true });
    expect(setup.events.at(-1)).toEqual({
      type: 'ready',
      id: 10,
      cached: false,
    });
    expect(setup.calls.localFilesOnly).toEqual([true, true]);
  });

  it('maps an inspection failure to a sanitized error', async () => {
    const setup = setupEngine();
    setup.options.cacheError = new Error('private cache details');
    await setup.engine.handle({ type: 'inspect', id: 1 });
    expect(setup.events).toEqual([{ type: 'error', id: 1, code: 'inspect' }]);
    expect(JSON.stringify(setup.events)).not.toContain('private cache details');
  });

  it('loads once, clamps progress and only reports ready after a warm-up', async () => {
    const setup = setupEngine();
    await setup.engine.handle({ type: 'prepare', id: 1, cacheOnly: false });
    await setup.engine.handle({ type: 'prepare', id: 2, cacheOnly: false });
    expect(setup.calls.model).toBe(1);
    expect(setup.calls.load).toBe(1);
    expect(setup.events).toEqual([
      { type: 'progress', id: 1, progress: null },
      { type: 'progress', id: 1, progress: 100 },
      { type: 'progress', id: 1, progress: 100 },
      { type: 'ready', id: 1, cached: false },
      { type: 'ready', id: 2, cached: false },
    ]);
    // The warm-up is a single token and never samples.
    expect(setup.calls.generate[0]).toMatchObject({
      max_new_tokens: 1,
      do_sample: false,
      repetition_penalty: 1,
      no_repeat_ngram_size: 0,
    });
  });

  it('disposes the model and hides raw text when the warm-up fails', async () => {
    const setup = setupEngine();
    setup.options.generate = async () => {
      throw new Error('no kernel for Gather with user text leaked');
    };
    await setup.engine.handle({ type: 'prepare', id: 1, cacheOnly: false });
    expect(setup.calls.dispose).toBe(1);
    expect(setup.events.at(-1)).toEqual({ type: 'error', id: 1, code: 'load' });
    expect(JSON.stringify(setup.events)).not.toContain('user text leaked');
    // A failed load is retryable rather than a permanently rejected promise.
    setup.options.generate = null;
    await setup.engine.handle({ type: 'prepare', id: 2, cacheOnly: false });
    expect(setup.events.at(-1)).toEqual({
      type: 'ready',
      id: 2,
      cached: false,
    });
  });

  it('never downloads a model from a generate command', async () => {
    const setup = setupEngine();
    await setup.engine.handle({
      type: 'generate',
      id: 1,
      request: { input: 'hi', task: 'ask', language: 'en' },
    });
    expect(setup.events).toEqual([{ type: 'error', id: 1, code: 'load' }]);
    expect(setup.calls.load).toBe(0);
    expect(setup.calls.model).toBe(0);
  });

  it('counts the fully built request with the prepared tokenizer only', async () => {
    const setup = await prepared(setupEngine());
    await setup.engine.handle({
      type: 'count',
      id: 11,
      request: { input: 'A prompt', task: 'rewrite', language: 'ja' },
    });
    expect(setup.events).toEqual([{ type: 'counted', id: 11, tokens: 20 }]);
    expect(setup.calls.template).toMatchObject({
      messages: [
        { role: 'system', content: expect.stringContaining('Japanese') },
        { role: 'user', content: 'A prompt' },
      ],
      config: {
        tokenize: true,
        add_generation_prompt: true,
        return_dict: true,
      },
    });
    expect(setup.calls.generate).toHaveLength(0);
  });

  it('returns unknown token count without creating a model session', async () => {
    const setup = setupEngine();
    await setup.engine.handle({
      type: 'count',
      id: 12,
      request: { input: 'A prompt', task: 'ask', language: 'en' },
    });
    expect(setup.events).toEqual([{ type: 'counted', id: 12, tokens: null }]);
    expect(setup.calls.load).toBe(0);
  });

  it('streams new text only and pins the output budget', async () => {
    const setup = await prepared(setupEngine());
    await setup.engine.handle({
      type: 'generate',
      id: 5,
      request: { input: 'hi', task: 'rewrite', language: 'en' },
    });
    expect(setup.events).toEqual([
      { type: 'delta', id: 5, text: 'answer' },
      {
        type: 'complete',
        id: 5,
        metrics: {
          outputTokens: 3,
          tokensPerSecond: expect.any(Number),
          timeToFirstTokenMs: expect.any(Number),
        },
      },
    ]);
    expect(setup.calls.generate[0]).toMatchObject({
      max_new_tokens: MAX_NEW_TOKENS,
      do_sample: false,
    });
    // explicit overrides keep the model's pinned generation defaults out of
    // user-visible generation behavior.
    expect(setup.calls.generate[0]).toMatchObject({
      repetition_penalty: 1,
      no_repeat_ngram_size: 0,
    });
    expect(setup.calls.generate[0].logits_processor).toEqual([
      expect.any(Function),
    ]);
    expect(setup.calls.template).toMatchObject({
      config: {
        tokenize: true,
        add_generation_prompt: true,
        return_dict: true,
      },
    });
  });

  it('reports generated token count, token rate and time to first visible output', async () => {
    const setup = await prepared(setupEngine());
    const times = [1_000, 1_100, 3_100];
    vi.spyOn(performance, 'now').mockImplementation(
      () => times.shift() ?? 3_100,
    );
    setup.options.generate = async (config) => {
      const processor = (
        config.logits_processor as ((
          inputIds: bigint[][],
          logits: Logits,
        ) => Logits)[]
      )[0];
      for (let token = 0; token < 3; token++) {
        processor([new Array(20 + token).fill(0n)], {
          0: { data: new Float32Array(8).fill(1) },
        });
      }
      (config.streamer as { callback: (text: string) => void }).callback(
        'text',
      );
    };
    await setup.engine.handle({
      type: 'generate',
      id: 13,
      request: { input: 'A prompt', task: 'ask', language: 'en' },
    });
    expect(setup.events.at(-1)).toEqual({
      type: 'complete',
      id: 13,
      metrics: {
        outputTokens: 3,
        tokensPerSecond: 1.5,
        timeToFirstTokenMs: 100,
      },
    });
    vi.restoreAllMocks();
  });

  it('rejects an over-budget tokenized prompt before calling generate', async () => {
    const setup = await prepared(setupEngine());
    setup.options.tokens = MAX_PROMPT_TOKENS + 1;
    await setup.engine.handle({
      type: 'generate',
      id: 2,
      request: { input: 'long', task: 'ask', language: 'en' },
    });
    expect(setup.events).toEqual([
      { type: 'error', id: 2, code: 'inputLimit' },
    ]);
    expect(setup.calls.generate).toHaveLength(0);
  });

  it('delivers a cancel without queueing behind the in-flight generation', async () => {
    const setup = await prepared(setupEngine());
    let release: (() => void) | undefined;
    setup.options.generate = async (config) => {
      (config.streamer as { callback: (t: string) => void }).callback(
        'partial',
      );
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      (config.streamer as { callback: (t: string) => void }).callback('late');
    };
    const running = setup.engine.handle({
      type: 'generate',
      id: 3,
      request: { input: 'hi', task: 'ask', language: 'en' },
    });
    await Promise.resolve();
    await setup.engine.handle({ type: 'cancel', id: 3 });
    expect(setup.stoppingCriteria.at(-1)?.interrupted).toBe(true);
    release?.();
    await running;
    // Post-cancel text is suppressed and the result is reported as cancelled.
    expect(setup.events).toEqual([
      { type: 'delta', id: 3, text: 'partial' },
      { type: 'cancelling', id: 3 },
      { type: 'cancelled', id: 3 },
    ]);
  });

  it('ignores a cancel aimed at another request', async () => {
    const setup = await prepared(setupEngine());
    await setup.engine.handle({ type: 'cancel', id: 99 });
    expect(setup.events).toEqual([]);
  });

  it('maps a storage quota exception to an actionable code', async () => {
    const setup = setupEngine();
    const quota = new Error('quota');
    quota.name = 'QuotaExceededError';
    setup.options.modelError = quota;
    await setup.engine.handle({ type: 'prepare', id: 1, cacheOnly: false });
    expect(setup.events.filter((event) => event.type !== 'progress')).toEqual([
      { type: 'error', id: 1, code: 'storage' },
    ]);
  });

  it('rejects a second command while one is in flight', async () => {
    const setup = setupEngine();
    const send = vi.fn();
    setup.options.generate = async () => {
      await Promise.resolve();
    };
    const first = setup.engine.handle({
      type: 'prepare',
      id: 1,
      cacheOnly: false,
    });
    await setup.engine.handle({ type: 'inspect', id: 2 });
    await first;
    expect(send).not.toHaveBeenCalled();
    expect(setup.events.some((event) => event.id === 2)).toBe(false);
  });
});
