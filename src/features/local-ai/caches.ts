import { MODEL_CACHE, RUNTIME_CACHE } from './modelCatalog';
import { LocalAIError } from './types';

const CACHE_PREFIX = 'magic-box-local-ai-';

// removes every version in this feature's cache namespace, including old pins.
// callers must terminate their worker first so this tab cannot refill a cache.
export async function deleteLocalAIDownloads(): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    throw new LocalAIError('storage');
  }
  try {
    const names = await caches.keys();
    await Promise.all(
      names
        .filter((name) => name.startsWith(CACHE_PREFIX))
        .map((name) => caches.delete(name)),
    );
  } catch {
    throw new LocalAIError('storage');
  }
}

export async function deleteStaleLocalAIDownloads(): Promise<void> {
  if (typeof caches === 'undefined') return;
  const names = await caches.keys();
  await Promise.all(
    names
      .filter(
        (name) =>
          name.startsWith(CACHE_PREFIX) &&
          name !== MODEL_CACHE &&
          name !== RUNTIME_CACHE,
      )
      .map((name) => caches.delete(name)),
  );
}
