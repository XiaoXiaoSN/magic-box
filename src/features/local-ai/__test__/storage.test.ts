import { afterEach, describe, expect, it, vi } from 'vitest';

import { readLocalAIStorageStatus } from '../storage';

afterEach(() => vi.unstubAllGlobals());

describe('readLocalAIStorageStatus', () => {
  it('reads quota, usage and persistence when the browser exposes them', async () => {
    vi.stubGlobal('navigator', {
      storage: {
        estimate: vi.fn(async () => ({ quota: 4_000, usage: 1_500 })),
        persisted: vi.fn(async () => true),
      },
    });

    await expect(readLocalAIStorageStatus()).resolves.toEqual({
      quotaBytes: 4_000,
      usageBytes: 1_500,
      persisted: true,
    });
  });

  it('returns unknown fields when storage APIs are absent or rejected', async () => {
    vi.stubGlobal('navigator', {
      storage: {
        estimate: vi.fn(async () => {
          throw new Error('not available');
        }),
        persisted: vi.fn(async () => {
          throw new Error('not available');
        }),
      },
    });
    await expect(readLocalAIStorageStatus()).resolves.toEqual({
      quotaBytes: null,
      usageBytes: null,
      persisted: null,
    });
  });
});
