import { useEffect, useState, useSyncExternalStore } from 'react';
import { LocalAIClient, type WorkerPort } from './client';

export function useLocalAI() {
  // Construction is side-effect free, including during React StrictMode.
  const [client] = useState(() => new LocalAIClient(() =>
    new Worker(new URL('./inference.worker.ts', import.meta.url), {
      type: 'module', name: 'magic-box-local-ai',
    }) as WorkerPort,
  ));
  const state = useSyncExternalStore(client.subscribe, client.getSnapshot);
  useEffect(() => {
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
