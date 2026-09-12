import {
  LocalAIError,
  MODEL,
  RUNTIME_URL,
  type WorkerEvent,
} from './protocol.js';

interface Tokenizer {
  (text: string, options: { add_special_tokens: false }): {
    input_ids: { size: number };
  };
  apply_chat_template(
    messages: { role: string; content: string }[],
    options: { tokenize: false; add_generation_prompt: true },
  ): string;
}
export interface Generator {
  (prompt: string, options: {
    max_new_tokens: number;
    do_sample: false;
    add_special_tokens: false;
    return_full_text: false;
    streamer: unknown;
  }): Promise<{ generated_text: string }[]>;
  tokenizer: Tokenizer;
}
export interface LoadedModel {
  generator: Generator;
  streamer: (callback: (text: string) => void) => unknown;
}
interface RuntimeModule {
  env: {
    allowLocalModels: boolean;
    useBrowserCache: boolean;
    useWasmCache: boolean;
    cacheKey: string;
    backends: { onnx: { wasm: { numThreads: number; proxy: boolean } } };
  };
  pipeline: (task: string, model: string, options: {
    device: 'webgpu';
    dtype: 'q4f16';
    revision: string;
    progress_callback: (progress: {
      status: string;
      file?: string;
      progress?: number;
    }) => void;
  }) => Promise<Generator>;
  TextStreamer: new (tokenizer: Tokenizer, options: {
    skip_prompt: true;
    skip_special_tokens: true;
    callback_function: (text: string) => void;
  }) => unknown;
}
export interface GPUProvider {
  requestAdapter(): Promise<{ features: { has: (feature: string) => boolean } } | null>;
}

export async function checkGPU(secure: boolean, gpu?: GPUProvider) {
  if (!secure) throw new LocalAIError('insecure');
  if (!gpu) throw new LocalAIError('unsupported');
  const adapter = await gpu.requestAdapter();
  if (!adapter) throw new LocalAIError('unsupported');
  if (!adapter.features.has('shader-f16')) throw new LocalAIError('fp16');
}

export async function loadModel(
  progress: (event: Omit<Extract<WorkerEvent, { type: 'progress' }>, 'id'>) => void,
): Promise<LoadedModel> {
  // Probe inside the actual inference Worker, before fetching the runtime/model.
  await checkGPU(
    globalThis.isSecureContext,
    (navigator as Navigator & { gpu?: GPUProvider }).gpu,
  );
  const runtime: RuntimeModule = await import(/* @vite-ignore */ RUNTIME_URL);
  runtime.env.allowLocalModels = false;
  runtime.env.useBrowserCache = typeof caches !== 'undefined';
  runtime.env.useWasmCache = typeof caches !== 'undefined';
  runtime.env.cacheKey = MODEL.cache;
  runtime.env.backends.onnx.wasm.numThreads = 1;
  runtime.env.backends.onnx.wasm.proxy = false;
  const generator = await runtime.pipeline('text-generation', MODEL.id, {
    device: 'webgpu',
    dtype: MODEL.dtype,
    revision: MODEL.revision,
    progress_callback: (event) => {
      if (event.file && ['initiate', 'progress', 'done'].includes(event.status)) {
        progress({
          type: 'progress',
          file: event.file,
          percent: event.status === 'done' ? 100 :
            typeof event.progress === 'number' && Number.isFinite(event.progress)
              ? Math.min(100, Math.max(0, event.progress)) : null,
        });
      }
    },
  });
  return {
    generator,
    streamer: (callback) => new runtime.TextStreamer(generator.tokenizer, {
      skip_prompt: true,
      skip_special_tokens: true,
      callback_function: callback,
    }),
  };
}
