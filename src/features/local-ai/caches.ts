import { MODEL_CACHE, RUNTIME_CACHE } from './modelCatalog';
import { LocalAIError } from './types';

// Removes only this feature's two caches — never Workbox's app caches, and
// never another feature's storage. Callers that own a worker must terminate it
// first: this tab has to be unable to repopulate the cache it is deleting.
// Other tabs still can, which is why the confirmation says so.
export async function deleteLocalAIDownloads(): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    throw new LocalAIError('storage');
  }
  try {
    await Promise.all([
      caches.delete(MODEL_CACHE),
      caches.delete(RUNTIME_CACHE),
    ]);
  } catch {
    throw new LocalAIError('storage');
  }
}
