import { LocalAIError } from './types';

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
        .filter((name) => name.startsWith('magic-box-local-ai-'))
        .map((name) => caches.delete(name)),
    );
  } catch {
    throw new LocalAIError('storage');
  }
}
