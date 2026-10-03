import { afterEach, describe, expect, it, vi } from 'vitest';

import { deleteLocalAIDownloads } from '../caches';
import { MODEL, MODEL_CACHE, RUNTIME_CACHE } from '../modelCatalog';
import { LocalAIError } from '../types';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('deleting local AI downloads', () => {
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
