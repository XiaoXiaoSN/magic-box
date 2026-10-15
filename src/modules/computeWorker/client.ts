import {
  type ComputeWorkerEvent,
  type ComputeWorkerRunRequest,
  isComputeWorkerEvent,
  isComputeWorkerRunRequest,
  rehydrateWorkerBox,
  type WorkerBoxDTO,
} from './dto';

export interface ComputeWorkerLike {
  postMessage(
    message: ComputeWorkerRunRequest | { type: 'cancel'; runId: string },
  ): void;
  terminate(): void;
  onmessage: ((event: MessageEvent<unknown>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  onmessageerror: ((event: MessageEvent<unknown>) => void) | null;
}

export interface ComputeWorkerRunResult {
  runId: string;
  results: ReadonlyMap<string, WorkerBoxDTO[]>;
  cancelled: boolean;
}

export interface ComputeWorkerRunHandlers {
  onSourceLoadStart?: (runId: string, sourceId: string) => void;
  onSourceStart?: (runId: string, sourceId: string) => void;
  onSourceResult?: (
    runId: string,
    sourceId: string,
    boxes: ReturnType<typeof rehydrateWorkerBox>[],
  ) => void;
  onSourceError?: (runId: string, sourceId: string, message: string) => void;
  onSourceLoadTimeout?: (runId: string, sourceId: string) => void;
  onSourceTimeout?: (runId: string, sourceId: string) => void;
  onComplete?: (result: ComputeWorkerRunResult) => void;
  onFailure?: (runId: string, message: string) => void;
}

export interface ComputeWorkerRunHandle {
  runId: string;
  promise: Promise<ComputeWorkerRunResult>;
  cancel: () => void;
}

export interface ComputeWorkerClientOptions {
  createWorker: () => ComputeWorkerLike;
  timeoutMs?: number;
  startupTimeoutMs?: number;
  loadTimeoutMs?: number;
  cancelGraceMs?: number;
}

interface RunState {
  request: ComputeWorkerRunRequest;
  handlers: ComputeWorkerRunHandlers;
  completed: Set<string>;
  results: Map<string, WorkerBoxDTO[]>;
  currentSource: string | null;
  phase: 'loading' | 'executing' | null;
  timer: ReturnType<typeof setTimeout> | null;
  loadTimer: ReturnType<typeof setTimeout> | null;
  startupTimer: ReturnType<typeof setTimeout> | null;
  settled: boolean;
  cancelled: boolean;
  resolve: (result: ComputeWorkerRunResult) => void;
  reject: (error: Error) => void;
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** owns one bounded worker and restarts only the unfinished batch after timeout. */
export class ComputeWorkerClient {
  private readonly createWorker: () => ComputeWorkerLike;
  private readonly timeoutMs: number;
  private readonly startupTimeoutMs: number;
  private readonly loadTimeoutMs: number;
  private readonly cancelGraceMs: number;
  private worker: ComputeWorkerLike | null = null;
  private activeRun: RunState | null = null;
  private released = false;

  constructor(options: ComputeWorkerClientOptions) {
    this.createWorker = options.createWorker;
    this.timeoutMs = options.timeoutMs ?? 2000;
    this.startupTimeoutMs = options.startupTimeoutMs ?? 10_000;
    this.loadTimeoutMs = options.loadTimeoutMs ?? 10_000;
    this.cancelGraceMs = options.cancelGraceMs ?? 50;
  }

  run(
    request: ComputeWorkerRunRequest,
    handlers: ComputeWorkerRunHandlers = {},
  ): ComputeWorkerRunHandle {
    if (!isComputeWorkerRunRequest(request)) {
      const promise = Promise.reject(
        new Error('Invalid compute worker request.'),
      );
      return {
        runId: (request as { runId?: string }).runId ?? '',
        promise,
        cancel: () => {},
      };
    }
    this.cancelActiveRun();

    let resolveRun: RunState['resolve'] = () => {};
    let rejectRun: RunState['reject'] = () => {};
    const promise = new Promise<ComputeWorkerRunResult>((resolve, reject) => {
      resolveRun = resolve;
      rejectRun = reject;
    });
    const state: RunState = {
      request,
      handlers,
      completed: new Set(),
      results: new Map(),
      currentSource: null,
      phase: null,
      timer: null,
      loadTimer: null,
      startupTimer: null,
      settled: false,
      cancelled: false,
      resolve: resolveRun,
      reject: rejectRun,
    };
    this.activeRun = state;
    this.startWorker(state, request.sourceIds);
    return {
      runId: request.runId,
      promise,
      cancel: () => this.cancelRun(state),
    };
  }

  release(): void {
    this.released = true;
    this.cancelActiveRun();
    this.terminateWorker();
  }

  private cancelActiveRun(): void {
    if (this.activeRun !== null) this.cancelRun(this.activeRun);
  }

  private cancelRun(state: RunState): void {
    if (state.settled) return;
    state.cancelled = true;
    this.clearSourceTimer(state);
    this.clearLoadTimer(state);
    this.clearStartupTimer(state);
    if (this.activeRun === state) this.activeRun = null;
    const worker = this.worker;
    if (worker !== null) {
      let cancellationPosted = true;
      try {
        worker.postMessage({ type: 'cancel', runId: state.request.runId });
      } catch {
        cancellationPosted = false;
      }
      if (this.worker === worker) {
        this.worker = null;
        this.detachWorker(worker);
      }
      if (!cancellationPosted) {
        worker.terminate();
      } else {
        setTimeout(() => {
          // a worker factory may return a shared test double. never terminate
          // a worker that has already been adopted by the next run.
          if (this.worker !== worker) worker.terminate();
        }, this.cancelGraceMs);
      }
    }
    this.settleCancelled(state);
  }

  private settleCancelled(state: RunState): void {
    if (state.settled) return;
    state.settled = true;
    const result: ComputeWorkerRunResult = {
      runId: state.request.runId,
      results: state.results,
      cancelled: true,
    };
    state.resolve(result);
  }

  private startWorker(state: RunState, sourceIds: readonly string[]): void {
    if (state.settled || state.cancelled || this.released) return;
    const worker = this.ensureWorker(state);
    if (worker === null) return;
    this.armStartupTimer(state);
    try {
      worker.postMessage({ ...state.request, sourceIds: [...sourceIds] });
    } catch (error) {
      this.failRun(
        state,
        `Unable to start compute worker: ${errorMessage(error)}`,
      );
    }
  }

  private ensureWorker(state: RunState): ComputeWorkerLike | null {
    if (this.worker !== null) return this.worker;
    try {
      const worker = this.createWorker();
      worker.onmessage = (event) => this.handleMessage(event.data);
      worker.onerror = () => {
        const active = this.activeRun;
        if (active !== null) this.failRun(active, 'Compute worker failed.');
      };
      worker.onmessageerror = () => {
        const active = this.activeRun;
        if (active !== null) {
          this.failRun(active, 'Compute worker returned an invalid message.');
        }
      };
      this.worker = worker;
      return worker;
    } catch (error) {
      this.failRun(
        state,
        `Compute worker is unavailable: ${errorMessage(error)}`,
      );
      return null;
    }
  }

  private handleMessage(rawEvent: unknown): void {
    if (!isComputeWorkerEvent(rawEvent)) return;
    const event = rawEvent as ComputeWorkerEvent;
    if (event.type === 'ready') return;
    const state = this.activeRun;
    if (
      state === null ||
      state.settled ||
      state.request.runId !== event.runId
    ) {
      return;
    }

    switch (event.type) {
      case 'started':
        this.clearStartupTimer(state);
        return;
      case 'source-load-start':
        if (state.completed.has(event.sourceId)) return;
        this.clearStartupTimer(state);
        this.clearSourceTimer(state);
        this.clearLoadTimer(state);
        state.currentSource = event.sourceId;
        state.phase = 'loading';
        state.loadTimer = setTimeout(
          () => this.handleLoadTimeout(state, event.sourceId),
          this.loadTimeoutMs,
        );
        state.handlers.onSourceLoadStart?.(event.runId, event.sourceId);
        return;
      case 'source-start':
        if (state.completed.has(event.sourceId)) return;
        this.clearStartupTimer(state);
        this.clearSourceTimer(state);
        this.clearLoadTimer(state);
        state.currentSource = event.sourceId;
        state.phase = 'executing';
        state.timer = setTimeout(
          () => this.handleTimeout(state, event.sourceId),
          this.timeoutMs,
        );
        state.handlers.onSourceStart?.(event.runId, event.sourceId);
        return;
      case 'source-result':
        if (state.completed.has(event.sourceId)) return;
        this.clearSourceTimer(state);
        this.clearLoadTimer(state);
        state.currentSource = null;
        state.phase = null;
        state.completed.add(event.sourceId);
        state.results.set(event.sourceId, event.boxes);
        state.handlers.onSourceResult?.(
          event.runId,
          event.sourceId,
          event.boxes.map(rehydrateWorkerBox),
        );
        return;
      case 'source-error':
        if (state.completed.has(event.sourceId)) return;
        this.clearSourceTimer(state);
        this.clearLoadTimer(state);
        state.currentSource = null;
        state.phase = null;
        state.completed.add(event.sourceId);
        state.handlers.onSourceError?.(
          event.runId,
          event.sourceId,
          event.message,
        );
        return;
      case 'finished':
        this.finishIfComplete(state);
        return;
      case 'failure':
        this.failRun(state, event.message);
        return;
    }
  }

  private handleTimeout(state: RunState, sourceId: string): void {
    if (
      this.activeRun !== state ||
      state.settled ||
      state.currentSource !== sourceId
    ) {
      return;
    }
    if (state.phase !== 'executing') return;
    state.currentSource = null;
    state.phase = null;
    state.completed.add(sourceId);
    state.timer = null;
    state.handlers.onSourceTimeout?.(state.request.runId, sourceId);
    this.terminateWorker();
    const remaining = state.request.sourceIds.filter(
      (candidate) => !state.completed.has(candidate),
    );
    if (remaining.length === 0) {
      this.finishRun(state);
      return;
    }
    this.startWorker(state, remaining);
  }

  private handleLoadTimeout(state: RunState, sourceId: string): void {
    if (
      this.activeRun !== state ||
      state.settled ||
      state.currentSource !== sourceId ||
      state.phase !== 'loading'
    ) {
      return;
    }
    state.currentSource = null;
    state.phase = null;
    state.completed.add(sourceId);
    state.loadTimer = null;
    state.handlers.onSourceLoadTimeout?.(state.request.runId, sourceId);
    this.terminateWorker();
    const remaining = state.request.sourceIds.filter(
      (candidate) => !state.completed.has(candidate),
    );
    if (remaining.length === 0) {
      this.finishRun(state);
      return;
    }
    this.startWorker(state, remaining);
  }

  private handleStartupTimeout(state: RunState): void {
    if (this.activeRun !== state || state.settled || state.phase !== null) {
      return;
    }
    this.failRun(state, 'Compute worker startup timed out.');
  }

  private finishIfComplete(state: RunState): void {
    if (
      state.completed.size >= new Set(state.request.sourceIds).size ||
      state.request.sourceIds.length === 0
    ) {
      this.finishRun(state);
    }
  }

  private finishRun(state: RunState): void {
    if (state.settled) return;
    this.clearSourceTimer(state);
    this.clearLoadTimer(state);
    this.clearStartupTimer(state);
    state.settled = true;
    if (this.activeRun === state) this.activeRun = null;
    const result: ComputeWorkerRunResult = {
      runId: state.request.runId,
      results: state.results,
      cancelled: false,
    };
    state.handlers.onComplete?.(result);
    state.resolve(result);
  }

  private failRun(state: RunState, message: string): void {
    if (state.settled) return;
    this.clearSourceTimer(state);
    this.clearLoadTimer(state);
    this.clearStartupTimer(state);
    state.settled = true;
    if (this.activeRun === state) this.activeRun = null;
    state.handlers.onFailure?.(state.request.runId, message);
    this.terminateWorker();
    state.reject(new Error(message));
  }

  private clearSourceTimer(state: RunState): void {
    if (state.timer !== null) clearTimeout(state.timer);
    state.timer = null;
  }

  private clearLoadTimer(state: RunState): void {
    if (state.loadTimer !== null) clearTimeout(state.loadTimer);
    state.loadTimer = null;
  }

  private armStartupTimer(state: RunState): void {
    this.clearStartupTimer(state);
    state.startupTimer = setTimeout(
      () => this.handleStartupTimeout(state),
      this.startupTimeoutMs,
    );
  }

  private clearStartupTimer(state: RunState): void {
    if (state.startupTimer !== null) clearTimeout(state.startupTimer);
    state.startupTimer = null;
  }

  private terminateWorker(): void {
    const worker = this.worker;
    this.worker = null;
    if (worker === null) return;
    this.detachWorker(worker);
    worker.terminate();
  }

  private detachWorker(worker: ComputeWorkerLike): void {
    worker.onmessage = null;
    worker.onerror = null;
    worker.onmessageerror = null;
  }
}
