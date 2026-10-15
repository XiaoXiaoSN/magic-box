import {
  MODEL,
  MODEL_CACHE,
  RUNTIME_CACHE,
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
  progress?: number;
}

interface WasmPaths {
  wasm?: string;
  mjs?: string;
  [name: string]: unknown;
}

export interface TransformersRuntime {
  env: {
    version: string;
    allowLocalModels: boolean;
    allowRemoteModels: boolean;
    useBrowserCache: boolean;
    useWasmCache: boolean;
    cacheKey: string;
    remotePathTemplate: string;
    logLevel: number;
    fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
    backends: {
      onnx: {
        wasm: {
          numThreads: number;
          proxy: boolean;
          wasmBinary?: ArrayBuffer | Uint8Array;
          wasmPaths?: string | WasmPaths;
        };
      };
    };
  };
  LogLevel: { NONE: number };
  ModelRegistry: {
    is_pipeline_cached(
      task: 'text-generation',
      model: string,
      options: Record<string, unknown>,
    ): Promise<boolean>;
  };
  AutoTokenizer: {
    from_pretrained(
      model: string,
      options: Record<string, unknown>,
    ): Promise<Tokenizer>;
  };
  AutoModelForCausalLM: {
    from_pretrained(
      model: string,
      options: Record<string, unknown>,
    ): Promise<GenerativeModel>;
  };
  TextStreamer: new (
    tokenizer: Tokenizer,
    options: { skip_prompt: true; callback_function: (text: string) => void },
  ) => unknown;
  InterruptableStoppingCriteria: new () => Interruptor;
}

interface CacheLike {
  match(request: RequestInfo | URL): Promise<Response | undefined>;
  put(request: RequestInfo | URL, response: Response): Promise<void>;
}

interface CacheStorageLike {
  open(name: string): Promise<CacheLike>;
}

interface RuntimeLoaderOptions {
  storage?: CacheStorageLike | null;
  fetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  importModule?: (url: string) => Promise<TransformersRuntime>;
  createObjectURL?: (blob: Blob) => string;
  revokeObjectURL?: (url: string) => void;
}

interface RuntimeDefaults {
  fetch: TransformersRuntime['env']['fetch'];
  useWasmCache: boolean;
  wasmBinary?: ArrayBuffer | Uint8Array;
  wasmPaths?: string | WasmPaths;
}

const runtimeDefaults = new WeakMap<TransformersRuntime, RuntimeDefaults>();
const cacheOnlyFactoryUrls = new WeakMap<
  TransformersRuntime,
  { url: string; revoke: (url: string) => void }
>();

const getStorage = (
  storage?: CacheStorageLike | null,
): CacheStorageLike | undefined =>
  storage === undefined
    ? (globalThis.caches as unknown as CacheStorageLike | undefined)
    : (storage ?? undefined);

const cloneWasmPaths = (
  paths: string | WasmPaths | undefined,
): string | WasmPaths | undefined =>
  typeof paths === 'object' && paths !== null ? { ...paths } : paths;

const runtimeImport = (url: string) =>
  import(/* @vite-ignore */ url) as Promise<TransformersRuntime>;

const browserFetch = (input: RequestInfo | URL, init?: RequestInit) =>
  globalThis.fetch(input, init);

async function openCache(
  storage: CacheStorageLike | undefined,
  name: string,
): Promise<CacheLike | undefined> {
  if (!storage) return undefined;
  return storage.open(name);
}

export async function loadRuntime(
  cacheOnly = false,
  options: RuntimeLoaderOptions = {},
): Promise<TransformersRuntime> {
  const storage = getStorage(options.storage);
  let cache: CacheLike | undefined;
  try {
    cache = await openCache(storage, RUNTIME_CACHE);
  } catch {
    if (cacheOnly) throw new LocalAIError('load');
  }

  let response: Response | undefined;
  try {
    response = await cache?.match(RUNTIME_URL);
  } catch {
    if (cacheOnly) throw new LocalAIError('load');
  }
  if (!response) {
    if (cacheOnly) throw new LocalAIError('load');
    const fetcher = options.fetch ?? browserFetch;
    response = await fetcher(RUNTIME_URL);
    if (!response.ok) throw new LocalAIError('load');
    try {
      await cache?.put(RUNTIME_URL, response.clone());
    } catch {
      // An explicit load can still use the fetched module when storage is full.
    }
  }
  if (!response.ok) throw new LocalAIError('load');

  const source = await response.text();
  const createObjectURL = options.createObjectURL ?? URL.createObjectURL;
  const revokeObjectURL = options.revokeObjectURL ?? URL.revokeObjectURL;
  const moduleUrl = createObjectURL(
    new Blob([source], { type: 'text/javascript' }),
  );
  let runtime: TransformersRuntime;
  try {
    runtime = await (options.importModule ?? runtimeImport)(moduleUrl);
  } finally {
    revokeObjectURL(moduleUrl);
  }
  if (runtime.env?.version !== RUNTIME_VERSION) throw new LocalAIError('load');

  const networkFetch = options.fetch ?? browserFetch;
  runtime.env.allowLocalModels = false;
  runtime.env.allowRemoteModels = true;
  runtime.env.useBrowserCache = true;
  runtime.env.useWasmCache = true;
  runtime.env.cacheKey = MODEL_CACHE;
  runtime.env.remotePathTemplate = `{model}/resolve/${MODEL.revision}/`;
  runtime.env.fetch = networkFetch;
  runtime.env.logLevel = runtime.LogLevel.NONE;
  runtime.env.backends.onnx.wasm.numThreads = 1;
  runtime.env.backends.onnx.wasm.proxy = false;
  runtimeDefaults.set(runtime, {
    fetch: networkFetch,
    useWasmCache: runtime.env.useWasmCache,
    wasmBinary: runtime.env.backends.onnx.wasm.wasmBinary,
    wasmPaths: cloneWasmPaths(runtime.env.backends.onnx.wasm.wasmPaths),
  });
  return runtime;
}

export async function isRuntimeCacheComplete(
  runtime: TransformersRuntime,
  storageInput?: CacheStorageLike | null,
): Promise<boolean> {
  const storage = getStorage(storageInput);
  const paths =
    runtimeDefaults.get(runtime)?.wasmPaths ??
    runtime.env.backends.onnx.wasm.wasmPaths;
  if (!storage || typeof paths !== 'object' || !paths?.wasm || !paths?.mjs) {
    return false;
  }
  const [runtimeCache, modelCache] = await Promise.all([
    openCache(storage, RUNTIME_CACHE),
    openCache(storage, MODEL_CACHE),
  ]);
  if (!runtimeCache || !modelCache) return false;
  const responses = await Promise.all([
    runtimeCache.match(RUNTIME_URL),
    modelCache.match(paths.wasm),
    modelCache.match(paths.mjs),
  ]);
  return responses.every((response) => response?.ok);
}

export async function areOrtAssetsCached(
  runtime: TransformersRuntime,
  storageInput?: CacheStorageLike | null,
): Promise<boolean> {
  const storage = getStorage(storageInput);
  const paths =
    runtimeDefaults.get(runtime)?.wasmPaths ??
    runtime.env.backends.onnx.wasm.wasmPaths;
  if (!storage || typeof paths !== 'object' || !paths?.wasm || !paths?.mjs) {
    return false;
  }
  const cache = await openCache(storage, MODEL_CACHE);
  if (!cache) return false;
  const [wasm, mjs] = await Promise.all([
    cache.match(paths.wasm),
    cache.match(paths.mjs),
  ]);
  return Boolean(wasm?.ok && mjs?.ok);
}

export async function configureRuntimeCacheOnly(
  runtime: TransformersRuntime,
  storageInput?: CacheStorageLike | null,
  createObjectURL: (blob: Blob) => string = URL.createObjectURL,
  revokeObjectURL: (url: string) => void = URL.revokeObjectURL,
): Promise<void> {
  const storage = getStorage(storageInput);
  const paths =
    runtimeDefaults.get(runtime)?.wasmPaths ??
    runtime.env.backends.onnx.wasm.wasmPaths;
  if (!storage || typeof paths !== 'object' || !paths?.wasm || !paths?.mjs) {
    throw new LocalAIError('load');
  }
  const cache = await openCache(storage, MODEL_CACHE);
  if (!cache) throw new LocalAIError('load');
  const [wasmResponse, factoryResponse] = await Promise.all([
    cache.match(paths.wasm),
    cache.match(paths.mjs),
  ]);
  if (!wasmResponse?.ok || !factoryResponse?.ok) {
    throw new LocalAIError('load');
  }

  const wasmBinary = await wasmResponse.arrayBuffer();
  const factorySource = (await factoryResponse.text()).replaceAll(
    'globalThis.process?.versions?.node',
    'false',
  );
  const factoryUrl = createObjectURL(
    new Blob([factorySource], { type: 'text/javascript' }),
  );
  releaseRuntimeCacheOnlyAssets(runtime);
  cacheOnlyFactoryUrls.set(runtime, {
    url: factoryUrl,
    revoke: revokeObjectURL,
  });
  runtime.env.allowRemoteModels = false;
  runtime.env.fetch = async (input) => {
    const response = await cache.match(input);
    if (!response?.ok) throw new LocalAIError('load');
    return response;
  };
  runtime.env.useWasmCache = false;
  runtime.env.backends.onnx.wasm.wasmBinary = wasmBinary;
  runtime.env.backends.onnx.wasm.wasmPaths = { ...paths, mjs: factoryUrl };
}

export function releaseRuntimeCacheOnlyAssets(
  runtime: TransformersRuntime,
): void {
  const factory = cacheOnlyFactoryUrls.get(runtime);
  if (factory) {
    factory.revoke(factory.url);
    cacheOnlyFactoryUrls.delete(runtime);
    runtime.env.backends.onnx.wasm.wasmBinary = undefined;
  }
}

export function configureRuntimeForNetwork(runtime: TransformersRuntime): void {
  const defaults = runtimeDefaults.get(runtime);
  if (!defaults) return;
  releaseRuntimeCacheOnlyAssets(runtime);
  runtime.env.allowRemoteModels = true;
  runtime.env.fetch = defaults.fetch;
  runtime.env.useWasmCache = defaults.useWasmCache;
  runtime.env.backends.onnx.wasm.wasmBinary = defaults.wasmBinary;
  runtime.env.backends.onnx.wasm.wasmPaths = cloneWasmPaths(defaults.wasmPaths);
}
