import {
  MODEL,
  MODEL_CACHE,
  RUNTIME_URL,
  RUNTIME_VERSION,
} from './modelCatalog';
import type { ChatMessage } from './tasks';
import { LocalAIError } from './types';

export interface ModelInputs {
  input_ids: { dims: number[] };
  [name: string]: unknown;
}
export interface Tokenizer {
  apply_chat_template(
    messages: ChatMessage[],
    options: {
      tokenize: true;
      add_generation_prompt: true;
      return_dict: true;
    },
  ): ModelInputs;
}
export interface GenerativeModel {
  generate(options: Record<string, unknown>): Promise<unknown>;
  dispose(): Promise<unknown>;
}
export interface Interruptor {
  interrupt(): void;
}
export interface RuntimeProgress {
  status: string;
  file?: string;
  progress?: number;
}

// Narrow adapter for the reviewed 4.2.0 standalone module, not ambient `any`.
// Keep this contract in sync when upgrading the pinned runtime (see docs).
export interface TransformersRuntime {
  env: {
    version: string;
    allowLocalModels: boolean;
    useBrowserCache: boolean;
    useWasmCache: boolean;
    cacheKey: string;
    remotePathTemplate: string;
    logLevel: number;
    backends: { onnx: { wasm: { numThreads: number; proxy: boolean } } };
  };
  LogLevel: { NONE: number };
  ModelRegistry: {
    get_pipeline_files(
      task: 'text-generation',
      model: string,
      options: Record<string, unknown>,
    ): Promise<string[]>;
    get_file_metadata(
      model: string,
      file: string,
      options: { revision: string },
    ): Promise<{ exists: boolean; size: number | null }>;
    is_pipeline_cached(
      task: 'text-generation',
      model: string,
      options: Record<string, unknown>,
    ): Promise<boolean>;
  };
  AutoTokenizer: {
    from_pretrained(model: string, options: Record<string, unknown>): Promise<Tokenizer>;
  };
  AutoModelForCausalLM: {
    from_pretrained(model: string, options: Record<string, unknown>): Promise<GenerativeModel>;
  };
  TextStreamer: new (
    tokenizer: Tokenizer,
    options: { skip_prompt: true; callback_function: (text: string) => void },
  ) => unknown;
  InterruptableStoppingCriteria: new () => Interruptor;
}

export async function loadRuntime(): Promise<TransformersRuntime> {
  // Only called inside the dedicated worker after explicit user intent.
  const runtime: TransformersRuntime = await import(/* @vite-ignore */ RUNTIME_URL);
  if (runtime.env?.version !== RUNTIME_VERSION) throw new LocalAIError('load');
  runtime.env.allowLocalModels = false;
  runtime.env.useBrowserCache = true;
  runtime.env.useWasmCache = true;
  runtime.env.cacheKey = MODEL_CACHE;
  // Pin metadata discovery too: some registry helpers don't forward revision.
  runtime.env.remotePathTemplate = `{model}/resolve/${MODEL.revision}/`;
  runtime.env.logLevel = runtime.LogLevel.NONE;
  runtime.env.backends.onnx.wasm.numThreads = 1;
  runtime.env.backends.onnx.wasm.proxy = false;
  return runtime;
}
