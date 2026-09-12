import {
  type AIRequest,
  type Command,
  type ErrorCode,
  LocalAIError,
  MODEL,
  validateRequest,
  type WorkerEvent,
} from './protocol.js';

export interface WorkerPort {
  onmessage: ((event: MessageEvent<WorkerEvent>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  onmessageerror: ((event: MessageEvent) => void) | null;
  postMessage: (command: Command) => void;
  terminate: () => void;
}
export interface AIState {
  phase: 'idle' | 'loading' | 'ready' | 'generating' | 'complete' | 'stopped' | 'error' | 'deleting';
  ready: boolean;
  text: string;
  error: ErrorCode | null;
  progress: { file: string; percent: number | null } | null;
}
const initial = (): AIState => ({
  phase: 'idle', ready: false, text: '', error: null, progress: null,
});
export const isBusy = (state: AIState) =>
  ['loading', 'generating', 'deleting'].includes(state.phase);

export class LocalAIClient {
  private worker: WorkerPort | null = null;
  private id = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private state = initial();
  private listeners = new Set<() => void>();
  constructor(
    private readonly createWorker: () => WorkerPort = () => new Worker(
      new URL('./inference.worker.ts', import.meta.url), { type: 'module' },
    ),
    private readonly deleteCache: () => Promise<unknown> = () => caches.delete(MODEL.cache),
    private readonly timeouts = { load: 15 * 60_000, generate: 120_000 },
  ) {}
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  private update(patch: Partial<AIState>) {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener();
  }
  private clearTimer() { clearTimeout(this.timer); this.timer = undefined; }
  private detach() {
    ++this.id;
    this.clearTimer();
    const worker = this.worker;
    this.worker = null;
    if (worker) {
      worker.onmessage = null;
      worker.onerror = null;
      worker.onmessageerror = null;
      worker.terminate();
    }
  }
  private fail(code: ErrorCode) {
    this.detach();
    this.update({ phase: 'error', ready: false, error: code, progress: null });
  }
  private send(command: Command, timeout: number) {
    this.clearTimer();
    this.timer = setTimeout(() => {
      if (this.id === command.id) this.fail('timeout');
    }, timeout);
    try { this.worker?.postMessage(command); } catch { this.fail('worker'); }
  }
  private receive(event: WorkerEvent) {
    if (event.id !== this.id || !isBusy(this.state)) return;
    switch (event.type) {
      case 'progress':
        if (this.state.phase === 'loading') this.update({ progress: event });
        break;
      case 'ready':
        if (this.state.phase !== 'loading') return;
        this.clearTimer();
        this.update({ phase: 'ready', ready: true, progress: null });
        break;
      case 'token':
        if (this.state.phase === 'generating') this.update({ text: this.state.text + event.text });
        break;
      case 'complete':
        if (this.state.phase !== 'generating') return;
        this.clearTimer();
        this.update({ phase: 'complete', text: event.text });
        break;
      case 'error':
        if (['invalidInput', 'inputTooLong'].includes(event.code) && this.state.ready) {
          this.clearTimer();
          this.update({ phase: 'error', error: event.code });
        } else this.fail(event.code);
    }
  }
  prepare() {
    if (isBusy(this.state) || this.state.ready) return;
    this.detach();
    this.update({ ...initial(), phase: 'loading' });
    try {
      const worker = this.createWorker();
      this.worker = worker;
      worker.onmessage = (event) => {
        if (this.worker === worker) this.receive(event.data);
      };
      worker.onerror = (event) => {
        event.preventDefault();
        if (this.worker === worker) this.fail('worker');
      };
      worker.onmessageerror = () => { if (this.worker === worker) this.fail('worker'); };
      this.send({ type: 'load', id: this.id }, this.timeouts.load);
    } catch { this.fail('worker'); }
  }
  generate(request: AIRequest) {
    if (isBusy(this.state) || !this.state.ready || !this.worker) return;
    try { validateRequest(request); } catch (error) {
      this.update({ phase: 'error', error: error instanceof LocalAIError ? error.code : 'invalidInput' });
      return;
    }
    ++this.id;
    this.update({ phase: 'generating', text: '', error: null });
    this.send({ type: 'generate', id: this.id, request: { ...request } }, this.timeouts.generate);
  }
  stop() {
    if (this.state.phase === 'deleting') return;
    this.detach();
    this.update({ phase: 'stopped', ready: false, error: null, progress: null });
  }
  // Restartable cleanup also works with React StrictMode's setup/cleanup cycle.
  release = () => { this.detach(); this.update(initial()); };
  async clearModel() {
    if (this.state.phase === 'deleting') return;
    this.release();
    const id = this.id;
    this.update({ phase: 'deleting' });
    try {
      await this.deleteCache();
      if (this.id === id) this.update(initial());
    } catch {
      if (this.id === id) this.update({ phase: 'error', error: 'cache' });
    }
  }
}
