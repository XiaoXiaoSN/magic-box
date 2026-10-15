import { useEffect, useState, useSyncExternalStore } from 'react';
import { LocalAIClient, type WorkerPort } from './client';
import { LocalAIModelOwnership } from './ownership';
import { isBusy } from './types';

export interface UseLocalAIOptions {
  // Tests inject a deterministic port instead of spawning a real module worker.
  createWorker?: () => WorkerPort;
  // Run the device/cache check once on mount. An inspect fetches the pinned
  // runtime from jsDelivr, probes WebGPU and reads the local model cache. It
  // never contacts Hugging Face model files or requests weights, so callers
  // gate it on `prefs.aiAutoCheck` and keep it off where mounting is not a
  // request to use the box (the /list preview).
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
  createWorker: () => WorkerPort;
  client: LocalAIClient;
  surfaces: number;
  grace: ReturnType<typeof setTimeout> | null;
  hiddenGrace: ReturnType<typeof setTimeout> | null;
  preparedCache: boolean;
  unsubscribe: () => void;
}

// One client per worker factory, so one per tab in production. The model's
// lifetime used to be the box's mount: clearing the input to type the next
// question, or visiting Settings, unmounted the panel and terminated a loaded
// ~467 MiB session. Owning it here, with a reference count and an explicit
// release policy, makes every surface (the box, the /list preview, Settings)
// a view of the same session. Tests pass their own factory per case and so get
// an isolated client.
const shared = new Map<() => WorkerPort, SharedClient>();
let lifecycleListenersInstalled = false;

const discardUnused = (entry: SharedClient): void => {
  const state = entry.client.getSnapshot();
  if (
    entry.surfaces > 0 ||
    entry.grace !== null ||
    entry.hiddenGrace !== null ||
    isBusy(state.phase) ||
    state.loaded ||
    shared.get(entry.createWorker) !== entry
  ) {
    return;
  }
  shared.delete(entry.createWorker);
  entry.unsubscribe();
  entry.client.dispose();
  if (shared.size === 0) removeLifecycleListeners();
};

const scheduleUnusedCleanup = (entry: SharedClient): void => {
  queueMicrotask(() => discardUnused(entry));
};

const onVisibilityChange = (): void => {
  for (const entry of shared.values()) {
    if (document.hidden) {
      if (entry.hiddenGrace !== null) clearTimeout(entry.hiddenGrace);
      entry.hiddenGrace = setTimeout(() => {
        entry.hiddenGrace = null;
        if (!document.hidden) return;
        if (entry.client.getSnapshot().phase === 'generating') {
          entry.client.stop();
        }
        entry.client.requestRelease('hidden');
      }, UNUSED_GRACE_MS);
      continue;
    }
    if (entry.hiddenGrace !== null) clearTimeout(entry.hiddenGrace);
    entry.hiddenGrace = null;
    entry.client.withdrawRelease('hidden');
    const state = entry.client.getSnapshot();
    if (
      entry.preparedCache &&
      !state.loaded &&
      !isBusy(state.phase) &&
      state.info?.cached
    ) {
      entry.client.prepare({ cacheOnly: true });
    }
  }
};

const onPageHide = (): void => {
  for (const entry of shared.values()) entry.client.release();
};

function removeLifecycleListeners(): void {
  if (!lifecycleListenersInstalled) return;
  document.removeEventListener('visibilitychange', onVisibilityChange);
  window.removeEventListener('pagehide', onPageHide);
  lifecycleListenersInstalled = false;
}

function installLifecycleListeners(): void {
  if (lifecycleListenersInstalled) return;
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('pagehide', onPageHide);
  lifecycleListenersInstalled = true;
}

const acquire = (createWorker: () => WorkerPort): SharedClient => {
  const existing = shared.get(createWorker);
  if (existing) return existing;
  const ownership =
    createWorker === createModuleWorker ? new LocalAIModelOwnership() : null;
  const client = new LocalAIClient(createWorker, ownership);
  const entry: SharedClient = {
    createWorker,
    client,
    surfaces: 0,
    grace: null,
    hiddenGrace: null,
    preparedCache: false,
    unsubscribe: () => {},
  };
  entry.unsubscribe = client.subscribe(() => {
    const state = client.getSnapshot();
    if (state.phase === 'ready')
      entry.preparedCache = state.info?.cached ?? false;
    if (state.phase === 'available' && !state.info?.cached) {
      entry.preparedCache = false;
    }
    if (!state.info?.cached) entry.preparedCache = false;
    if (
      entry.surfaces === 0 &&
      entry.grace === null &&
      entry.hiddenGrace === null
    ) {
      scheduleUnusedCleanup(entry);
    }
  });
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
    installLifecycleListeners();
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
        scheduleUnusedCleanup(entry);
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

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    for (const entry of shared.values()) {
      if (entry.grace !== null) clearTimeout(entry.grace);
      if (entry.hiddenGrace !== null) clearTimeout(entry.hiddenGrace);
      entry.unsubscribe();
      entry.client.dispose();
    }
    shared.clear();
    removeLifecycleListeners();
  });
}
