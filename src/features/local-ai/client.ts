import type { AICommand, AIErrorCode, AIEvent, AIRequest, AIState } from './types';
import { isBusy } from './types';

export interface WorkerPort {
  postMessage(command: AICommand): void;
  terminate(): void;
  onmessage: ((event: MessageEvent<AIEvent>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  onmessageerror: (() => void) | null;
}

const initialState = (): AIState => ({
  phase: 'idle', loaded: false, info: null, output: '', submitted: null,
  error: null, progress: null,
});

export class LocalAIClient {
  private state = initialState();
  private worker: WorkerPort | null = null;
  private nextId = 0;
  private activeId: number | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<() => void>();

  constructor(private readonly createWorker: () => WorkerPort) { }

  getSnapshot = (): AIState => this.state;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  inspect(): boolean {
    if (isBusy(this.state.phase) || this.state.loaded) return false;
    return this.start({ type: 'inspect', id: ++this.nextId }, 'inspecting', 60_000);
  }

  prepare(): boolean {
    if (isBusy(this.state.phase) || !this.state.info || this.state.loaded) return false;
    return this.start({ type: 'prepare', id: ++this.nextId }, 'loading', 600_000);
  }

  generate(request: AIRequest): boolean {
    if (isBusy(this.state.phase) || !this.state.loaded) return false;
    const snapshot = { ...request };
    this.update({ output: '', submitted: snapshot });
    return this.start(
      { type: 'generate', id: ++this.nextId, request: snapshot }, 'generating', 180_000,
    );
  }

  stop(): void {
    if (!isBusy(this.state.phase)) return;
    if (this.state.phase === 'generating' && this.worker && this.activeId !== null) {
      this.update({ phase: 'stopping' });
      this.clearTimer();
      // Cooperative stop first. If inference monopolizes the worker event
      // loop, terminate it instead of merely ignoring its output forever.
      this.timer = setTimeout(() => this.release(), 2000);
      try {
        this.worker.postMessage({ type: 'cancel', id: this.activeId });
      } catch {
        this.release();
      }
    } else if (this.state.phase !== 'stopping') {
      this.release(); // also really aborts downloads / initialization
    }
  }

  release(): void {
    const phase = isBusy(this.state.phase) ? 'stopped' :
      this.state.phase === 'complete' || this.state.phase === 'stopped' ? this.state.phase : 'idle';
    this.terminate();
    this.update({ phase, loaded: false, progress: null });
  }

  reset(): void {
    this.terminate();
    this.state = initialState();
    this.emit();
  }

  dispose(): void {
    this.terminate();
    this.state = initialState();
    this.listeners.clear();
  }

  private start(command: AICommand, phase: AIState['phase'], timeout: number): boolean {
    this.activeId = command.id;
    this.update({ phase, error: null, progress: null });
    this.timer = setTimeout(() => this.fail('timeout'), timeout);
    try {
      if (!this.worker) {
        const worker = this.createWorker();
        this.worker = worker;
        worker.onmessage = (event) => {
          if (this.worker === worker) this.receive(event.data);
        };
        worker.onerror = (event) => {
          event.preventDefault(); // don't leak worker error details into telemetry
          if (this.worker === worker) this.fail('load');
        };
        worker.onmessageerror = () => {
          if (this.worker === worker) this.fail('load');
        };
      }
      this.worker.postMessage(command);
      return true;
    } catch {
      this.fail('unsupported');
      return false;
    }
  }

  private receive(event: AIEvent): void {
    if (event.id !== this.activeId) return;
    if (event.type === 'delta') {
      if (this.state.phase === 'generating') this.update({ output: this.state.output + event.text });
      return;
    }
    if (event.type === 'progress') {
      if (this.state.phase === 'loading') this.update({ progress: { file: event.file, percent: event.progress } });
      return;
    }
    this.clearTimer();
    this.activeId = null;
    if (event.type === 'error') {
      if (event.code === 'inputLimit' || event.code === 'invalidRequest') {
        this.update({ phase: 'error', error: event.code });
      } else {
        this.fail(event.code);
      }
    } else if (event.type === 'available') {
      this.update({ phase: 'available', info: event.info });
    } else if (event.type === 'ready') {
      this.update({ phase: 'ready', loaded: true, progress: null });
    } else {
      // A complete response racing with cancel is still presented as stopped;
      // no post-cancel delta was accepted by this client.
      this.update({ phase: event.type === 'cancelled' || this.state.phase === 'stopping' ? 'stopped' : 'complete' });
    }
  }

  private fail(error: AIErrorCode): void {
    this.terminate(); // also resets poisoned ORT initialization chains on retry
    this.update({ phase: 'error', loaded: false, error, progress: null });
  }

  private terminate(): void {
    this.clearTimer();
    this.activeId = null;
    const worker = this.worker;
    this.worker = null;
    if (worker) {
      worker.onmessage = null;
      worker.onerror = null;
      worker.onmessageerror = null;
      worker.terminate();
    }
  }

  private clearTimer(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }

  private update(next: Partial<AIState>): void {
    this.state = { ...this.state, ...next };
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}
