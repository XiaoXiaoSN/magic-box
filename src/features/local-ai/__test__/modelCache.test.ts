import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { isModelCached, MODEL_CACHE_FILES } from '../modelCache';
import { MODEL, MODEL_CACHE } from '../modelCatalog';

const base = `https://huggingface.co/${MODEL.id}/resolve/${MODEL.revision}/`;
const urls = MODEL_CACHE_FILES.map((file) => `${base}${file}`);
const network = vi.fn(() => {
  throw new Error('Cache inspection must not make a network request');
});

const createStorage = (entries: string[], cacheName = MODEL_CACHE) => {
  const cached = new Set(entries);
  // Presence is all the inspector needs: no body needs to be read or decoded.
  const response = {} as Response;
  const match = vi.fn(
    async (request: RequestInfo | URL, options?: MultiCacheQueryOptions) => {
      const url =
        typeof request === 'string'
          ? request
          : request instanceof URL
            ? request.href
            : request.url;
      return options?.cacheName === cacheName && cached.has(url)
        ? response
        : undefined;
    },
  );
  return { match };
};

beforeEach(() => {
  network.mockClear();
  vi.stubGlobal('fetch', network);
  vi.stubGlobal('caches', undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('local AI cache-only inspection', () => {
  it('pins every model and tokenizer file, including generation config', () => {
    expect(MODEL_CACHE_FILES).toEqual([
      'config.json',
      'generation_config.json',
      'tokenizer.json',
      'tokenizer_config.json',
      'onnx/model_q4f16.onnx',
    ]);
  });

  it('reports no cache when CacheStorage is unavailable', async () => {
    expect(await isModelCached()).toBe(false);
    expect(network).not.toHaveBeenCalled();
  });

  it('reports an empty cache without downloading metadata', async () => {
    expect(await isModelCached(createStorage([]))).toBe(false);
    expect(network).not.toHaveBeenCalled();
  });

  it('reports a config-only partial download without a registry probe', async () => {
    expect(await isModelCached(createStorage([`${base}config.json`]))).toBe(
      false,
    );
    expect(network).not.toHaveBeenCalled();
  });

  it.each(MODEL_CACHE_FILES)('requires the cached %s file', async (missing) => {
    const storage = createStorage(
      urls.filter((url) => url !== `${base}${missing}`),
    );
    expect(await isModelCached(storage)).toBe(false);
    expect(network).not.toHaveBeenCalled();
  });

  it('checks the complete cache without reading weights or using the network', async () => {
    const storage = createStorage(urls);
    vi.stubGlobal('caches', storage);
    expect(await isModelCached()).toBe(true);
    expect(storage.match).toHaveBeenCalledTimes(MODEL_CACHE_FILES.length);
    for (const url of urls) {
      expect(storage.match).toHaveBeenCalledWith(url, {
        cacheName: MODEL_CACHE,
      });
    }
    expect(network).not.toHaveBeenCalled();
  });

  it('does not accept the same files from another model revision', async () => {
    const storage = createStorage(
      urls.map((url) => url.replace(MODEL.revision, 'another-revision')),
    );
    expect(await isModelCached(storage)).toBe(false);
    expect(network).not.toHaveBeenCalled();
  });

  it('does not accept matching URLs from another feature cache', async () => {
    expect(await isModelCached(createStorage(urls, 'another-feature'))).toBe(
      false,
    );
    expect(network).not.toHaveBeenCalled();
  });

  it('propagates storage errors for the engine to sanitise', async () => {
    const error = new Error('private cache details');
    const storage = { match: vi.fn().mockRejectedValue(error) };
    await expect(isModelCached(storage)).rejects.toBe(error);
    expect(network).not.toHaveBeenCalled();
  });
});
