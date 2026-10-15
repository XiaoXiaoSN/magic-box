import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  MODEL_CACHE,
  RUNTIME_CACHE,
  RUNTIME_URL,
  RUNTIME_VERSION,
} from '../modelCatalog';
import {
  areOrtAssetsCached,
  configureRuntimeCacheOnly,
  configureRuntimeForNetwork,
  isRuntimeCacheComplete,
  loadRuntime,
  releaseRuntimeCacheOnlyAssets,
  type TransformersRuntime,
} from '../runtime';

const WASM_URL =
  'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.25.0/dist/ort-wasm-simd-threaded.asyncify.wasm';
const FACTORY_URL = WASM_URL.replace('.wasm', '.mjs');

const key = (request: RequestInfo | URL): string =>
  request instanceof Request
    ? request.url
    : request instanceof URL
      ? request.href
      : request;

const createStorage = (entries: Record<string, string> = {}) => {
  const cached = new Map(
    Object.entries(entries).map(([url, body]) => [url, new Response(body)]),
  );
  const cache = {
    match: vi.fn(async (request: RequestInfo | URL) => {
      return cached.get(key(request))?.clone();
    }),
    put: vi.fn(async (request: RequestInfo | URL, response: Response) => {
      cached.set(key(request), response.clone());
    }),
    delete: (url: string) => cached.delete(url),
  };
  const storage = {
    open: vi.fn(async (_name: string) => cache),
  };
  return { storage, cache };
};

const createRuntime = (): TransformersRuntime =>
  ({
    env: {
      version: RUNTIME_VERSION,
      allowLocalModels: false,
      allowRemoteModels: true,
      useBrowserCache: true,
      useWasmCache: true,
      cacheKey: '',
      remotePathTemplate: '',
      logLevel: 0,
      fetch: vi.fn(),
      backends: {
        onnx: {
          wasm: {
            numThreads: 1,
            proxy: false,
            wasmPaths: { wasm: WASM_URL, mjs: FACTORY_URL },
          },
        },
      },
    },
    LogLevel: { NONE: 50 },
  }) as unknown as TransformersRuntime;

const objectUrl = () => 'blob:local-ai-test';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('local AI pinned runtime cache', () => {
  it('fails closed when a cache-only runtime module is missing', async () => {
    const { storage } = createStorage();
    const fetcher = vi.fn(async () => new Response('remote runtime'));
    const importer = vi.fn(async () => createRuntime());

    await expect(
      loadRuntime(true, {
        storage,
        fetch: fetcher,
        importModule: importer,
        createObjectURL: objectUrl,
        revokeObjectURL: vi.fn(),
      }),
    ).rejects.toMatchObject({ code: 'load' });

    expect(fetcher).not.toHaveBeenCalled();
    expect(importer).not.toHaveBeenCalled();
  });

  it('loads the cached runtime without a service worker controller', async () => {
    vi.stubGlobal('navigator', { serviceWorker: { controller: null } });
    const { storage } = createStorage({ [RUNTIME_URL]: 'cached runtime' });
    const importer = vi.fn(async (url: string) => {
      expect(url).toBe('blob:local-ai-test');
      return createRuntime();
    });
    const fetcher = vi.fn(async () => new Response('network'));

    await loadRuntime(true, {
      storage,
      fetch: fetcher,
      importModule: importer,
      createObjectURL: objectUrl,
      revokeObjectURL: vi.fn(),
    });

    expect(importer).toHaveBeenCalledOnce();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('requires runtime, WASM and factory entries for durable cache status', async () => {
    const runtime = createRuntime();
    const complete = createStorage({
      [RUNTIME_URL]: 'cached runtime',
      [WASM_URL]: 'cached wasm',
      [FACTORY_URL]: 'cached factory',
    });
    const missingRuntime = createStorage({
      [WASM_URL]: 'cached wasm',
      [FACTORY_URL]: 'cached factory',
    });

    expect(await isRuntimeCacheComplete(runtime, complete.storage)).toBe(true);
    expect(await isRuntimeCacheComplete(runtime, missingRuntime.storage)).toBe(
      false,
    );
  });

  it('keeps explicit runtime loading available and stores the fetched module', async () => {
    const { storage, cache } = createStorage();
    const fetcher = vi.fn(async () => new Response('runtime source'));
    const importer = vi.fn(async () => createRuntime());

    await loadRuntime(false, {
      storage,
      fetch: fetcher,
      importModule: importer,
      createObjectURL: objectUrl,
      revokeObjectURL: vi.fn(),
    });

    expect(fetcher).toHaveBeenCalledWith(RUNTIME_URL);
    expect(importer).toHaveBeenCalledOnce();
    expect(cache.put).toHaveBeenCalledWith(RUNTIME_URL, expect.any(Response));
  });

  it('does not let a missing ORT asset fall through to a network fetch', async () => {
    const { storage } = createStorage({ [WASM_URL]: 'cached wasm' });
    const runtime = createRuntime();
    const network = vi.fn(async () => new Response('network'));
    vi.stubGlobal('fetch', network);

    await expect(
      configureRuntimeCacheOnly(runtime, storage, objectUrl),
    ).rejects.toMatchObject({ code: 'load' });
    expect(network).not.toHaveBeenCalled();
    expect(runtime.env.allowRemoteModels).toBe(true);
  });

  it('fails if the ORT cache entry is evicted after the presence probe', async () => {
    const { storage, cache } = createStorage({
      [WASM_URL]: 'cached wasm',
      [FACTORY_URL]: 'cached factory',
    });
    const runtime = createRuntime();
    expect(await areOrtAssetsCached(runtime, storage)).toBe(true);
    cache.delete(WASM_URL);
    const network = vi.fn(async () => new Response('network'));
    vi.stubGlobal('fetch', network);

    await expect(
      configureRuntimeCacheOnly(runtime, storage, objectUrl),
    ).rejects.toMatchObject({ code: 'load' });
    expect(network).not.toHaveBeenCalled();
  });

  it('serves the cache-only runtime fetch adapter from cache and rejects misses', async () => {
    const { storage } = createStorage({
      [WASM_URL]: 'cached wasm',
      [FACTORY_URL]: 'cached factory',
    });
    const runtime = createRuntime();

    await configureRuntimeCacheOnly(runtime, storage, objectUrl);
    await expect(runtime.env.fetch(WASM_URL)).resolves.toBeInstanceOf(Response);
    await expect(
      runtime.env.fetch('https://huggingface.co/missing'),
    ).rejects.toMatchObject({ code: 'load' });
    expect(runtime.env.allowRemoteModels).toBe(false);
    expect(runtime.env.useWasmCache).toBe(false);
    expect(runtime.env.backends.onnx.wasm.wasmBinary).toBeInstanceOf(
      ArrayBuffer,
    );
    expect(runtime.env.backends.onnx.wasm.wasmPaths).toMatchObject({
      wasm: WASM_URL,
      mjs: 'blob:local-ai-test',
    });
    expect(storage.open).toHaveBeenCalledWith(MODEL_CACHE);
    expect(storage.open).not.toHaveBeenCalledWith(RUNTIME_CACHE);
  });

  it('releases cache-only ORT assets and restores the explicit network path', async () => {
    const { storage, cache } = createStorage({
      [RUNTIME_URL]: 'cached runtime',
      [WASM_URL]: 'cached wasm',
      [FACTORY_URL]: 'cached factory',
    });
    const runtime = createRuntime();
    const network = vi.fn(async () => new Response('network'));
    const revoke = vi.fn();
    await loadRuntime(true, {
      storage,
      fetch: network,
      importModule: async () => runtime,
      createObjectURL: () => 'blob:runtime',
      revokeObjectURL: vi.fn(),
    });
    await configureRuntimeCacheOnly(
      runtime,
      storage,
      () => 'blob:factory',
      revoke,
    );
    cache.delete(FACTORY_URL);

    await expect(runtime.env.fetch(FACTORY_URL)).rejects.toMatchObject({
      code: 'load',
    });
    expect(network).not.toHaveBeenCalled();
    expect(runtime.env.backends.onnx.wasm.wasmBinary).toBeInstanceOf(
      ArrayBuffer,
    );

    releaseRuntimeCacheOnlyAssets(runtime);
    expect(revoke).toHaveBeenCalledWith('blob:factory');
    expect(runtime.env.backends.onnx.wasm.wasmBinary).toBeUndefined();
    configureRuntimeForNetwork(runtime);

    await expect(runtime.env.fetch(FACTORY_URL)).resolves.toBeInstanceOf(
      Response,
    );
    expect(runtime.env.allowRemoteModels).toBe(true);
    expect(runtime.env.useWasmCache).toBe(true);
    expect(runtime.env.backends.onnx.wasm.wasmPaths).toEqual({
      wasm: WASM_URL,
      mjs: FACTORY_URL,
    });
    expect(network).toHaveBeenCalledWith(FACTORY_URL);
  });
});
