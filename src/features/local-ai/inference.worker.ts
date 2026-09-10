import { checkCapabilities, type GPUAccess } from './capabilities';
import { LocalAIEngine } from './engine';
import { MODEL_CACHE } from './modelCatalog';
import { loadRuntime } from './runtime';
import { LocalAIError } from './types';
import type { AICommand, AIEvent } from './types';

// A minimal dedicated-worker surface avoids polluting the app's DOM lib with
// conflicting webworker globals. Nothing here is imported by the TUI.
const scope = globalThis as unknown as {
  isSecureContext: boolean;
  navigator: { gpu?: GPUAccess };
  postMessage(event: AIEvent): void;
  addEventListener(type: 'message', listener: (event: MessageEvent<AICommand>) => void): void;
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
