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

const createModuleWorker = (): WorkerPort =>
  new Worker(new URL('./inference.worker.ts', import.meta.url), {
    type: 'module',
    name: 'magic-box-local-ai',
  }) as WorkerPort;

// How long a loaded model outlives its last surface. Long enough to span a
// remount (retyping `::ai`, Settings and back); short enough that ~500 MB of GPU
// memory is not held for a box nobody can see.
const UNUSED_GRACE_MS = 30_000;

interface SharedClient {
  client: LocalAIClient;
  surfaces: number;
  grace: ReturnType<typeof setTimeout> | null;
}

// One client per worker factory, so one per tab in production. The model's
// lifetime used to be the box's mount: clearing the input to type the next
// question, or visiting Settings, unmounted the panel and terminated a loaded
// ~467 MiB session. Owning it here, with a reference count and an explicit
// release policy, makes every surface (the box, the /list preview, Settings)
// a view of the same session. Tests pass their own factory per case and so get
// an isolated client.
const shared = new Map<() => WorkerPort, SharedClient>();

const acquire = (createWorker: () => WorkerPort): SharedClient => {
  const existing = shared.get(createWorker);
  if (existing) return existing;
  const entry: SharedClient = {
    client: new LocalAIClient(createWorker),
    surfaces: 0,
    grace: null,
  };
  const { client } = entry;
  // A backgrounded tab holding ~500 MB of GPU memory is the main cause of
  // allocation failures elsewhere, so drop the worker — but only once idle:
  // `requestRelease` lets a download or an answer in flight finish first.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) client.requestRelease('hidden');
    else client.withdrawRelease('hidden');
  });
  window.addEventListener('pagehide', () => client.release());
  shared.set(createWorker, entry);
  return entry;
};

export function useLocalAI({
  createWorker = createModuleWorker,
  autoInspect = false,
}: UseLocalAIOptions = {}) {
  // Construction is side-effect free, including under React StrictMode: no
  // worker is spawned until an explicit inspect/prepare call.
  const [entry] = useState(() => acquire(createWorker));
  const { client } = entry;
  const state = useSyncExternalStore(client.subscribe, client.getSnapshot);

  useEffect(() => {
    entry.surfaces += 1;
    if (entry.grace !== null) clearTimeout(entry.grace);
    entry.grace = null;
    entry.client.withdrawRelease('unused');
    return () => {
      entry.surfaces -= 1;
      if (entry.surfaces > 0) return;
      entry.grace = setTimeout(() => {
        entry.grace = null;
        // Nobody can read an answer that is still streaming, so stop it; a
        // download is left to finish so the bytes land in the cache.
        if (entry.client.getSnapshot().phase === 'generating') {
          entry.client.stop();
        }
        entry.client.requestRelease('unused');
      }, UNUSED_GRACE_MS);
    };
  }, [entry]);

  // Once per mount, and only from a blank state: a shared client that already
  // knows the size, is busy, is loaded, or failed its last check is left alone.
  // Retrying a failed check is the button's job, never a remount's.
  useEffect(() => {
    if (!autoInspect) return;
    const { phase, info } = client.getSnapshot();
    if (phase === 'idle' && !info) client.inspect();
  }, [autoInspect, client]);

  return { client, state };
}
