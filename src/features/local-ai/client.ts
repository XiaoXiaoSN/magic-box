import type { ModelOwnership } from './ownership';
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
  inputTokens: null,
  countedRequest: null,
  metrics: null,
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
  firstToken: 300_000,
  inactivity: 120_000,
  cancelAck: 2_000,
  cancel: 30_000,
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
  private latestCountId: number | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<() => void>();
  // Reasons the worker should go as soon as nothing is in flight. A release
  // requested mid-download or mid-generation waits for that work to settle
  // instead of throwing it away (see `requestRelease`).
  private releaseRequests = new Set<ReleaseReason>();
  private stopReason: 'user' | 'timeout' | null = null;

  constructor(
    private readonly createWorker: () => WorkerPort,
    private readonly ownership: ModelOwnership | null = null,
  ) {
    ownership?.setReleaseHandler(() => {
      this.release();
      this.forgetCache();
    });
  }

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

  prepare(options: { cacheOnly?: boolean } = {}): boolean {
    if (isBusy(this.state.phase) || !this.state.info || this.state.loaded) {
      return false;
    }
    const cacheOnly = options.cacheOnly ?? this.state.info.cached;
    return this.start(
      { type: 'prepare', id: ++this.nextId, cacheOnly },
      'loading',
      // Cached files move no bytes, so the whole step is session setup.
      cacheOnly ? TIMEOUTS.init : TIMEOUTS.stall,
    );
  }

  generate(request: AIRequest): boolean {
    if (isBusy(this.state.phase) || !this.state.loaded) return false;
    // Snapshot the request: editing the draft mid-generation must not change
    // what was actually submitted, or what the result is attributed to.
    const snapshot = { ...request };
    this.stopReason = null;
    this.update({ output: '', submitted: snapshot, metrics: null });
    return this.start(
      { type: 'generate', id: ++this.nextId, request: snapshot },
      'generating',
      TIMEOUTS.firstToken,
      () => this.expireGeneration(),
    );
  }

  count(request: AIRequest): boolean {
    if (!this.state.loaded || !this.worker) return false;
    const snapshot = { ...request };
    const id = ++this.nextId;
    this.latestCountId = id;
    this.update({ inputTokens: null, countedRequest: snapshot });
    try {
      this.worker.postMessage({ type: 'count', id, request: snapshot });
      return true;
    } catch {
      this.fail('load');
      return false;
    }
  }

  invalidateCount(): void {
    this.latestCountId = null;
    this.update({ inputTokens: null, countedRequest: null });
  }

  async acquireDeletionLease(): Promise<(() => void) | null> {
    this.release();
    this.forgetCache();
    if (!this.ownership) return () => {};
    if (!(await this.ownership.acquireForDeletion())) return null;
    return () => this.ownership?.release();
  }

  stop(): void {
    if (!isBusy(this.state.phase)) return;
    if (
      this.state.phase === 'generating' &&
      this.worker &&
      this.activeId !== null
    ) {
      this.stopReason = 'user';
      this.update({ phase: 'stopping' });
      this.arm(TIMEOUTS.cancelAck, () => this.release());
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
    const phase =
      this.state.phase === 'error'
        ? 'error'
        : isBusy(this.state.phase)
          ? 'stopped'
          : this.state.phase === 'complete' || this.state.phase === 'stopped'
            ? this.state.phase
            : 'idle';
    this.stopReason = null;
    this.latestCountId = null;
    this.terminate();
    this.update({
      phase,
      loaded: false,
      progress: null,
      inputTokens: null,
      countedRequest: null,
    });
  }

  reset(): void {
    this.releaseRequests.clear();
    this.stopReason = null;
    this.latestCountId = null;
    this.terminate();
    this.state = initialState();
    this.emit();
  }

  // Listener removal is owned by the unsubscribe callback `subscribe` returns,
  // so dispose must not clear the set: under StrictMode the store resubscribes
  // around this cleanup.
  dispose(): void {
    this.reset();
    this.ownership?.dispose();
  }

  private start(
    command: AICommand,
    phase: AIState['phase'],
    timeout: number,
    onTimeout?: () => void,
  ): boolean {
    this.activeId = command.id;
    this.update({ phase, error: null, progress: null });
    this.arm(timeout, onTimeout);
    if (command.type === 'prepare' && this.ownership) {
      void this.ownership
        .acquire()
        .then((status) => {
          if (this.activeId !== command.id) {
            if (status === 'acquired') this.ownership?.release();
            return;
          }
          if (status !== 'acquired') {
            this.fail('busy');
            return;
          }
          this.post(command);
        })
        .catch(() => {
          if (this.activeId === command.id) this.fail('busy');
        });
      return true;
    }
    return this.post(command);
  }

  private post(command: AICommand): boolean {
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
    if (event.type === 'counted') {
      if (event.id === this.latestCountId)
        this.update({ inputTokens: event.tokens });
      return;
    }
    if (event.id !== this.activeId) return;
    if (event.type === 'delta') {
      if (this.state.phase === 'generating') {
        this.arm(TIMEOUTS.inactivity, () => this.expireGeneration());
        this.update({ output: this.state.output + event.text });
      }
      return;
    }
    if (event.type === 'cancelling') {
      if (this.state.phase === 'stopping') {
        this.arm(TIMEOUTS.cancel, () => {
          if (this.stopReason === 'timeout') this.fail('timeout');
          else this.release();
        });
      }
      return;
    }
    if (event.type === 'progress') {
      if (this.state.phase === 'loading') {
        // A sign of life re-arms the stall bound; the last byte hands over to
        // the session-setup bound.
        this.arm(event.progress === 100 ? TIMEOUTS.init : TIMEOUTS.stall);
        if (
          this.state.progress === null ||
          this.state.progress.percent !== event.progress
        ) {
          this.update({ progress: { percent: event.progress } });
        }
      }
      return;
    }
    this.clearTimer();
    this.activeId = null;
    if (event.type === 'error') {
      const error = this.stopReason === 'timeout' ? 'timeout' : event.code;
      this.stopReason = null;
      if (error === 'inputLimit' || error === 'invalidRequest') {
        // Recoverable: the loaded model stays usable for a shorter prompt.
        this.update({ phase: 'error', error });
      } else {
        this.fail(error);
      }
    } else if (event.type === 'available') {
      this.ownership?.release();
      this.update({
        phase: 'available',
        loaded: false,
        info: event.info,
        error: null,
        progress: null,
      });
    } else if (event.type === 'ready') {
      this.update({
        phase: 'ready',
        loaded: true,
        progress: null,
        error: null,
        inputTokens: null,
        countedRequest: null,
        info: this.state.info
          ? { ...this.state.info, cached: event.cached }
          : null,
      });
    } else if (event.type === 'complete') {
      const wasStopping = this.state.phase === 'stopping';
      const timedOut = this.stopReason === 'timeout';
      this.stopReason = null;
      this.update({
        phase: timedOut ? 'error' : wasStopping ? 'stopped' : 'complete',
        error: timedOut ? 'timeout' : null,
        metrics: event.metrics,
      });
    } else {
      const timedOut = this.stopReason === 'timeout';
      this.stopReason = null;
      this.update({
        phase: timedOut ? 'error' : 'stopped',
        loaded: true,
        error: timedOut ? 'timeout' : null,
      });
    }
  }

  private expireGeneration(): void {
    if (
      this.state.phase !== 'generating' ||
      !this.worker ||
      this.activeId === null
    ) {
      return;
    }
    this.stopReason = 'timeout';
    this.update({ phase: 'stopping' });
    this.arm(TIMEOUTS.cancelAck, () => this.fail('timeout'));
    try {
      this.worker.postMessage({ type: 'cancel', id: this.activeId });
    } catch {
      this.fail('timeout');
    }
  }

  private fail(error: AIErrorCode): void {
    // Terminating also discards a poisoned ORT initialization chain, so a retry
    // starts from a clean worker instead of re-awaiting a rejected promise.
    this.terminate();
    this.stopReason = null;
    this.latestCountId = null;
    this.update({ phase: 'error', loaded: false, error, progress: null });
  }

  private terminate(): void {
    this.clearTimer();
    this.activeId = null;
    this.ownership?.release();
    const worker = this.worker;
    this.worker = null;
    if (worker) {
      worker.onmessage = null;
      worker.onerror = null;
      worker.onmessageerror = null;
      worker.terminate();
    }
  }

  private arm(
    timeout: number,
    onTimeout: () => void = () => this.fail('timeout'),
  ): void {
    this.clearTimer();
    this.timer = setTimeout(onTimeout, timeout);
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

  private forgetCache(): void {
    if (this.state.info?.cached) {
      this.update({ info: { ...this.state.info, cached: false } });
    }
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}
