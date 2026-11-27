import { handleWithCacheAccess } from './cacheAccess';
import { checkCapabilities, type GPUAccess } from './capabilities';
import { LocalAIEngine } from './engine';
import { MODEL_CACHE } from './modelCatalog';
import { loadRuntime } from './runtime';
import type { AICommand, AIEvent } from './types';
import { LocalAIError } from './types';

// A minimal dedicated-worker surface keeps conflicting webworker globals out of
// the app's DOM lib. Nothing in this graph is reachable from the TUI.
const scope = globalThis as unknown as {
  isSecureContext: boolean;
  navigator: { gpu?: GPUAccess };
  postMessage(event: AIEvent): void;
  close(): void;
  addEventListener(
    type: 'message',
    listener: (event: MessageEvent<AICommand>) => void,
  ): void;
};

const send = (event: AIEvent): void => {
  scope.postMessage(event);
  if (
    event.type === 'error' &&
    event.code !== 'inputLimit' &&
    event.code !== 'invalidRequest'
  ) {
    // A failed model load can have sibling fetches in flight. Stop the worker
    // here without waiting for the tab to process the error and terminate it.
    scope.close();
  }
};
const engine = new LocalAIEngine(
  send,
  async () => {
    await checkCapabilities(scope.isSecureContext, scope.navigator.gpu);
    try {
      if (!('caches' in globalThis)) throw new Error('storage');
      await caches.open(MODEL_CACHE);
    } catch {
      throw new LocalAIError('storage');
    }
  },
  loadRuntime,
);

scope.addEventListener('message', (event) => {
  void handleWithCacheAccess(
    event.data,
    (command) => engine.handle(command),
    send,
  );
});
