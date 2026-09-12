import { useEffect, useState, useSyncExternalStore } from 'react';
import { LocalAIClient, type WorkerPort } from './client';

export interface UseLocalAIOptions {
  // Tests inject a deterministic port instead of spawning a real module worker.
  createWorker?: () => WorkerPort;
}

export function useLocalAI({ createWorker }: UseLocalAIOptions = {}) {
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
