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
  // A download is bounded by inactivity, not by wall clock: every progress
  // event re-arms this, so a slow link that keeps moving always finishes.
  // A fixed 10-minute cap needed >= 6.5 Mbit/s sustained for 467 MiB, and each
  // retry started the large file from zero, so a slower link could never
  // install the model at all.
  stall: 120_000,
  // Once the bytes are in (or were cached), ORT builds the WebGPU session and
  // runs the warm-up. That emits no events, so it gets its own fixed bound.
  init: 300_000,
  generate: 180_000,
  // Grace period for a cooperative interrupt before the worker is terminated.
  interrupt: 2_000,
} as const;

export type ReleaseReason = 'hidden' | 'unused';

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
  // Reasons the worker should go as soon as nothing is in flight. A release
  // requested mid-download or mid-generation waits for that work to settle
  // instead of throwing it away (see `requestRelease`).
  private releaseRequests = new Set<ReleaseReason>();

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
      // Cached files move no bytes, so the whole step is session setup.
      this.state.info.cached ? TIMEOUTS.init : TIMEOUTS.stall,
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

  // Release once idle rather than now. A hidden tab or an unmounted last
  // surface should free ~500 MB of GPU memory, but terminating mid-download
  // loses every byte of the in-flight file (a phone locking its screen during
  // the download meant starting over), and terminating mid-generation drops an
  // answer the user is waiting for.
  requestRelease(reason: ReleaseReason): void {
    this.releaseRequests.add(reason);
    this.releaseIfRequested();
  }

  withdrawRelease(reason: ReleaseReason): void {
    this.releaseRequests.delete(reason);
  }

  release(): void {
    this.releaseRequests.clear();
    const phase = isBusy(this.state.phase)
      ? 'stopped'
      : this.state.phase === 'complete' || this.state.phase === 'stopped'
        ? this.state.phase
        : 'idle';
    this.terminate();
    this.update({ phase, loaded: false, progress: null });
  }

  reset(): void {
    this.releaseRequests.clear();
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
    this.activeId = command.id;
    this.update({ phase, error: null, progress: null });
    this.arm(timeout);
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
        // A sign of life re-arms the stall bound; the last byte hands over to
        // the session-setup bound.
        this.arm(event.progress === 100 ? TIMEOUTS.init : TIMEOUTS.stall);
        this.update({ progress: { percent: event.progress } });
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
      // A loaded model is proof the files are in the cache now. Without this a
      // later release would offer the full download again, and describePhase
      // would call the cache read a download.
      this.update({
        phase: 'ready',
        loaded: true,
        progress: null,
        info: this.state.info ? { ...this.state.info, cached: true } : null,
      });
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

  private arm(timeout: number): void {
    this.clearTimer();
    this.timer = setTimeout(() => this.fail('timeout'), timeout);
  }

  private releaseIfRequested(): void {
    if (!this.releaseRequests.size || isBusy(this.state.phase)) return;
    // Nothing held: releasing would only rewrite the phase (an `error` phase
    // would read as `idle` while its message is still on screen).
    if (!this.worker && !this.state.loaded) {
      this.releaseRequests.clear();
      return;
    }
    this.release();
  }

  private clearTimer(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }

  private update(next: Partial<AIState>): void {
    this.state = { ...this.state, ...next };
    this.emit();
    this.releaseIfRequested();
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}
