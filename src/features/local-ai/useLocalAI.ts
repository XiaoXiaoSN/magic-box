import { useEffect, useState, useSyncExternalStore } from 'react';
import { LocalAIClient, type WorkerPort } from './client';

export interface UseLocalAIOptions {
  // Tests inject a deterministic port instead of spawning a real module worker.
  createWorker?: () => WorkerPort;
  // Run the metadata check once on mount. An inspect fetches the runtime from
  // jsDelivr and one metadata request per model file from Hugging Face, never
  // weights, so callers gate it on `prefs.aiAutoCheck` and keep it off where
  // mounting is not a request to use the box (the /list preview).
  autoInspect?: boolean;
}

export function useLocalAI({
  createWorker,
  autoInspect = false,
}: UseLocalAIOptions = {}) {
  // Construction is side-effect free, including under React StrictMode: no
  // worker is spawned until an explicit inspect/prepare call.
  const [client] = useState(
    () =>
      new LocalAIClient(
        createWorker ??
          (() =>
            new Worker(new URL('./inference.worker.ts', import.meta.url), {
              type: 'module',
              name: 'magic-box-local-ai',
            }) as WorkerPort),
      ),
  );
  const state = useSyncExternalStore(client.subscribe, client.getSnapshot);

  // Once per mount, never on retry: `inspect()` is a no-op while busy or
  // loaded, and a failed check leaves `phase: 'error'` that this effect must
  // not keep re-entering. Re-running it is the button's job.
  useEffect(() => {
    if (autoInspect) client.inspect();
  }, [autoInspect, client]);

  useEffect(() => {
    // A backgrounded tab holding ~500 MB of GPU memory is the main cause of
    // allocation failures elsewhere, so drop the worker instead of idling.
    const releaseWhenHidden = () => {
      if (document.hidden) client.release();
    };
    const releaseOnPageHide = () => client.release();
    document.addEventListener('visibilitychange', releaseWhenHidden);
    window.addEventListener('pagehide', releaseOnPageHide);
    return () => {
      document.removeEventListener('visibilitychange', releaseWhenHidden);
      window.removeEventListener('pagehide', releaseOnPageHide);
      client.dispose();
    };
  }, [client]);

  return { client, state };
}
