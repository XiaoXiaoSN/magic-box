import { afterEach, describe, expect, it, vi } from 'vitest';

import { deleteLocalAIDownloads, deleteStaleLocalAIDownloads } from '../caches';
import { MODEL, MODEL_CACHE, RUNTIME_CACHE } from '../modelCatalog';
import { LocalAIError } from '../types';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('deleting local AI downloads', () => {
  it('removes stale pins while retaining the current model and runtime', async () => {
    const stale = [
      `magic-box-local-ai-4.2.0-${MODEL.revision}-q4f16`,
      'magic-box-local-ai-runtime-v1',
    ];
    const remaining = new Set([
      ...stale,
      MODEL_CACHE,
      RUNTIME_CACHE,
      'workbox-precache-v2',
    ]);
    vi.stubGlobal('caches', {
      keys: vi.fn(async () => [...remaining]),
      delete: vi.fn(async (name: string) => remaining.delete(name)),
    });

    await deleteStaleLocalAIDownloads();

    expect([...remaining]).toEqual([
      MODEL_CACHE,
      RUNTIME_CACHE,
      'workbox-precache-v2',
    ]);
  });

  it('reclaims older pins and preserves unrelated caches', async () => {
    const owned = [
      `magic-box-local-ai-4.2.0-${MODEL.revision}-q4f16`,
      'magic-box-local-ai-runtime-v1',
      MODEL_CACHE,
      RUNTIME_CACHE,
    ];
    const unrelated = [
      'workbox-precache-v2',
      'another-feature',
      'magic-box-local-audio',
    ];
    const remaining = new Set([...owned, ...unrelated]);
    vi.stubGlobal('caches', {
      keys: vi.fn(async () => [...remaining]),
      delete: vi.fn(async (name: string) => remaining.delete(name)),
    });

    await deleteLocalAIDownloads();

    expect([...remaining]).toEqual(unrelated);
  });

  it('succeeds when there are no AI downloads', async () => {
    const remove = vi.fn();
    vi.stubGlobal('caches', {
      keys: vi.fn(async () => ['workbox-precache-v2']),
      delete: remove,
    });

    await deleteLocalAIDownloads();

    expect(remove).not.toHaveBeenCalled();
  });

  it('waits for the remaining deletions before reporting a storage failure', async () => {
    const finish = Promise.withResolvers<boolean>();
    vi.stubGlobal('caches', {
      keys: async () => [MODEL_CACHE, RUNTIME_CACHE],
      delete: async (name: string) => {
        if (name === MODEL_CACHE) throw new Error('private storage details');
        return finish.promise;
      },
    });

    const settled = vi.fn();
    const removing = deleteLocalAIDownloads().catch(settled);
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(settled).not.toHaveBeenCalled();
    finish.resolve(true);
    await removing;
    expect(settled).toHaveBeenCalledExactlyOnceWith(
      new LocalAIError('storage'),
    );
  });

  it.each([
    'keys',
    'delete',
  ] as const)('sanitizes a %s failure', async (operation) => {
    const fail = vi
      .fn()
      .mockRejectedValue(new Error('private storage details'));
    vi.stubGlobal('caches', {
      keys: operation === 'keys' ? fail : vi.fn(async () => [MODEL_CACHE]),
      delete: operation === 'delete' ? fail : vi.fn(),
    });

    await expect(deleteLocalAIDownloads()).rejects.toEqual(
      new LocalAIError('storage'),
    );
  });
});
