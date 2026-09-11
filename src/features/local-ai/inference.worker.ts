import { createEngine } from './engine.js';
import type { Command, WorkerEvent } from './protocol.js';

// Structural typing avoids adding DOM/WebWorker lib conflicts to the app tsconfig.
const scope = globalThis as unknown as {
  onmessage: ((event: MessageEvent<Command>) => void) | null;
  postMessage: (event: WorkerEvent) => void;
};
const handle = createEngine((event) => scope.postMessage(event));
scope.onmessage = (event) => { void handle(event.data); };
