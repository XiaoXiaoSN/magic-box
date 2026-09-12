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
  addEventListener(
    type: 'message',
    listener: (event: MessageEvent<AICommand>) => void,
  ): void;
};

const engine = new LocalAIEngine(
  (event) => scope.postMessage(event),
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
  void engine.handle(event.data);
});
