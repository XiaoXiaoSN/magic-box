import type {
  AICommand,
  AIErrorCode,
  AIEvent,
  AIRequest,
  AIState,
} from './types';
import { isBusy } from './types';

export interface WorkerPort {
  postMessage(command: AICommand): void;
  terminate(): void;
  onmessage: ((event: MessageEvent<AIEvent>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  onmessageerror: (() => void) | null;
}

const initialState = (): AIState => ({
  phase: 'idle',
  loaded: false,
  info: null,
  output: '',
  submitted: null,
  error: null,
  progress: null,
});

const TIMEOUTS = {
  inspect: 60_000,
  prepare: 600_000,
  generate: 180_000,
  // Grace period for a cooperative interrupt before the worker is terminated.
  interrupt: 2_000,
} as const;

// Owns the worker lifecycle and the single-flight state machine. Every
// transition is driven from the main thread so that a request id AND the worker
// identity both have to match before an event is accepted — a terminated
// worker's late message can never revive a stale phase.
export class LocalAIClient {
  private state = initialState();
  private worker: WorkerPort | null = null;
  private nextId = 0;
  private activeId: number | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<() => void>();

  constructor(private readonly createWorker: () => WorkerPort) {}

  getSnapshot = (): AIState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  // Metadata only. Never requests weights, so it is safe to call before the
  // user has agreed to a download.
  inspect(): boolean {
    if (isBusy(this.state.phase) || this.state.loaded) return false;
    return this.start(
      { type: 'inspect', id: ++this.nextId },
      'inspecting',
      TIMEOUTS.inspect,
    );
  }

  prepare(): boolean {
    if (isBusy(this.state.phase) || !this.state.info || this.state.loaded) {
      return false;
    }
    return this.start(
      { type: 'prepare', id: ++this.nextId },
      'loading',
      TIMEOUTS.prepare,
    );
  }

  generate(request: AIRequest): boolean {
    if (isBusy(this.state.phase) || !this.state.loaded) return false;
    // Snapshot the request: editing the draft mid-generation must not change
    // what was actually submitted, or what the result is attributed to.
    const snapshot = { ...request };
    this.update({ output: '', submitted: snapshot });
    return this.start(
      { type: 'generate', id: ++this.nextId, request: snapshot },
      'generating',
      TIMEOUTS.generate,
    );
  }

  stop(): void {
    if (!isBusy(this.state.phase)) return;
    if (
      this.state.phase === 'generating' &&
      this.worker &&
      this.activeId !== null
    ) {
      this.update({ phase: 'stopping' });
      this.clearTimer();
      // Cooperative stop first so the loaded model survives a cancel. If
      // inference monopolizes the worker event loop, terminate it rather than
      // ignoring its output forever.
      this.timer = setTimeout(() => this.release(), TIMEOUTS.interrupt);
      try {
        this.worker.postMessage({ type: 'cancel', id: this.activeId });
      } catch {
        this.release();
      }
    } else if (this.state.phase !== 'stopping') {
      // Terminating is the only way to abort a blocked download or an ORT
      // initialization that has not yielded yet.
      this.release();
    }
  }

  release(): void {
    const phase = isBusy(this.state.phase)
      ? 'stopped'
      : this.state.phase === 'complete' || this.state.phase === 'stopped'
        ? this.state.phase
        : 'idle';
    this.terminate();
    this.update({ phase, loaded: false, progress: null });
  }

  reset(): void {
    this.terminate();
    this.state = initialState();
    this.emit();
  }

  // Listener removal is owned by the unsubscribe callback `subscribe` returns,
  // so dispose must not clear the set: under StrictMode the store resubscribes
  // around this cleanup.
  dispose(): void {
    this.reset();
  }

  private start(
    command: AICommand,
    phase: AIState['phase'],
    timeout: number,
  ): boolean {
    this.clearTimer();
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
          event.preventDefault(); // keep worker error details out of telemetry
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
      if (this.state.phase === 'generating') {
        this.update({ output: this.state.output + event.text });
      }
      return;
    }
    if (event.type === 'progress') {
      if (this.state.phase === 'loading') {
        this.update({
          progress: { file: event.file, percent: event.progress },
        });
      }
      return;
    }
    this.clearTimer();
    this.activeId = null;
    if (event.type === 'error') {
      if (event.code === 'inputLimit' || event.code === 'invalidRequest') {
        // Recoverable: the loaded model stays usable for a shorter prompt.
        this.update({ phase: 'error', error: event.code });
      } else {
        this.fail(event.code);
      }
    } else if (event.type === 'available') {
      this.update({ phase: 'available', info: event.info });
    } else if (event.type === 'ready') {
      this.update({ phase: 'ready', loaded: true, progress: null });
    } else {
      // A completion racing with cancel is still reported as stopped; no delta
      // after the cancel was ever accepted, so the text would be misleading.
      this.update({
        phase:
          event.type === 'cancelled' || this.state.phase === 'stopping'
            ? 'stopped'
            : 'complete',
      });
    }
  }

  private fail(error: AIErrorCode): void {
    // Terminating also discards a poisoned ORT initialization chain, so a retry
    // starts from a clean worker instead of re-awaiting a rejected promise.
    this.terminate();
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
