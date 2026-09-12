import { describe, expect, it, vi } from 'vitest';

import { LocalAIEngine } from '../engine';
import {
  MAX_NEW_TOKENS,
  MAX_PROMPT_TOKENS,
  MODEL,
  MODEL_OPTIONS,
} from '../modelCatalog';
import type { RuntimeProgress, TransformersRuntime } from '../runtime';
import type { AIEvent } from '../types';

interface Options {
  tokens: number;
  bytes: number | null;
  exists: boolean;
  cached: boolean;
  modelError: Error | null;
  generate: ((config: Record<string, unknown>) => Promise<void>) | null;
}

const setupEngine = () => {
  const events: AIEvent[] = [];
  const calls = {
    load: 0,
    check: 0,
    tokenizer: 0,
    model: 0,
    dispose: 0,
    metadata: [] as { file: string; revision: string }[],
    generate: [] as Record<string, unknown>[],
    template: null as { messages: unknown; config: unknown } | null,
  };
  const options: Options = {
    tokens: 20,
    bytes: 100,
    exists: true,
    cached: false,
    modelError: null,
    generate: null,
  };
  const interruptors: { interrupted: boolean }[] = [];

  class Interruptor {
    interrupted = false;
    constructor() {
      interruptors.push(this);
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
      (config.streamer as Streamer | undefined)?.callback('answer');
    },
    async dispose() {
      calls.dispose++;
    },
  };
  const runtime = {
    ModelRegistry: {
      async get_pipeline_files(
        task: string,
        id: string,
        config: Record<string, unknown>,
      ) {
        expect(task).toBe('text-generation');
        expect(id).toBe(MODEL.id);
        expect(config).toEqual(MODEL_OPTIONS);
        return ['config.json', 'onnx/model_q4f16.onnx'];
      },
      async get_file_metadata(
        _id: string,
        file: string,
        config: { revision: string },
      ) {
        calls.metadata.push({ file, revision: config.revision });
        return { exists: options.exists, size: options.bytes };
      },
      async is_pipeline_cached() {
        return options.cached;
      },
    },
    AutoTokenizer: {
      async from_pretrained(_id: string, config: { revision: string }) {
        expect(config.revision).toBe(MODEL.revision);
        calls.tokenizer++;
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
          progress_callback: (event: RuntimeProgress) => void;
        },
      ) {
        calls.model++;
        expect(config).toMatchObject({
          revision: MODEL.revision,
          device: 'webgpu',
          dtype: 'q4f16',
        });
        if (options.modelError) throw options.modelError;
        // Out-of-range progress is clamped, not forwarded verbatim.
        config.progress_callback({
          status: 'progress',
          file: 'model.onnx',
          progress: 150,
        });
        config.progress_callback({ status: 'initiate', file: 'ignored.onnx' });
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
  );
  return { engine, events, calls, options, interruptors };
};

const prepared = async (setup: ReturnType<typeof setupEngine>) => {
  await setup.engine.handle({ type: 'prepare', id: 1 });
  setup.events.length = 0;
  setup.calls.generate.length = 0;
  return setup;
};

describe('local AI engine', () => {
  it('inspects pinned metadata only, never a tokenizer or weights', async () => {
    const setup = setupEngine();
    await setup.engine.handle({ type: 'inspect', id: 7 });
    expect(setup.events).toEqual([
      { type: 'available', id: 7, info: { bytes: 200, cached: false } },
    ]);
    expect(
      setup.calls.metadata.every((m) => m.revision === MODEL.revision),
    ).toBe(true);
    expect(setup.calls.tokenizer).toBe(0);
    expect(setup.calls.model).toBe(0);
    expect(setup.calls.check).toBe(1);
  });

  it('treats an unknown file size as an error, not a zero-byte download', async () => {
    const setup = setupEngine();
    setup.options.bytes = null;
    await setup.engine.handle({ type: 'inspect', id: 1 });
    expect(setup.events).toEqual([{ type: 'error', id: 1, code: 'metadata' }]);
  });

  it('loads once, clamps progress and only reports ready after a warm-up', async () => {
    const setup = setupEngine();
    await setup.engine.handle({ type: 'prepare', id: 1 });
    await setup.engine.handle({ type: 'prepare', id: 2 });
    expect(setup.calls.model).toBe(1);
    expect(setup.calls.load).toBe(1);
    expect(setup.events).toEqual([
      { type: 'progress', id: 1, file: 'model.onnx', progress: 100 },
      { type: 'ready', id: 1 },
      { type: 'ready', id: 2 },
    ]);
    // The warm-up is a single token and never samples.
    expect(setup.calls.generate[0]).toMatchObject({
      max_new_tokens: 1,
      do_sample: false,
    });
  });

  it('disposes the model and hides raw text when the warm-up fails', async () => {
    const setup = setupEngine();
    setup.options.generate = async () => {
      throw new Error('no kernel for Gather with user text leaked');
    };
    await setup.engine.handle({ type: 'prepare', id: 1 });
    expect(setup.calls.dispose).toBe(1);
    expect(setup.events.at(-1)).toEqual({ type: 'error', id: 1, code: 'load' });
    expect(JSON.stringify(setup.events)).not.toContain('user text leaked');
    // A failed load is retryable rather than a permanently rejected promise.
    setup.options.generate = null;
    await setup.engine.handle({ type: 'prepare', id: 2 });
    expect(setup.events.at(-1)).toEqual({ type: 'ready', id: 2 });
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

  it('streams new text only and pins the output budget', async () => {
    const setup = await prepared(setupEngine());
    await setup.engine.handle({
      type: 'generate',
      id: 5,
      request: { input: 'hi', task: 'rewrite', language: 'en' },
    });
    expect(setup.events).toEqual([
      { type: 'delta', id: 5, text: 'answer' },
      { type: 'complete', id: 5 },
    ]);
    expect(setup.calls.generate[0]).toMatchObject({
      max_new_tokens: MAX_NEW_TOKENS,
      do_sample: false,
    });
    expect(setup.calls.template).toMatchObject({
      config: {
        tokenize: true,
        add_generation_prompt: true,
        return_dict: true,
      },
    });
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
    expect(setup.interruptors.at(-1)?.interrupted).toBe(true);
    release?.();
    await running;
    // Post-cancel text is suppressed and the result is reported as cancelled.
    expect(setup.events).toEqual([
      { type: 'delta', id: 3, text: 'partial' },
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
    await setup.engine.handle({ type: 'prepare', id: 1 });
    expect(setup.events).toEqual([{ type: 'error', id: 1, code: 'storage' }]);
  });

  it('rejects a second command while one is in flight', async () => {
    const setup = setupEngine();
    const send = vi.fn();
    setup.options.generate = async () => {
      await Promise.resolve();
    };
    const first = setup.engine.handle({ type: 'prepare', id: 1 });
    await setup.engine.handle({ type: 'inspect', id: 2 });
    await first;
    expect(send).not.toHaveBeenCalled();
    expect(setup.events.some((event) => event.id === 2)).toBe(false);
  });
});
