import { MODEL_CACHE, RUNTIME_CACHE } from './modelCatalog';

export type OwnershipStatus = 'acquired' | 'busy' | 'unsupported';

export interface OwnershipAcquireOptions {
  signal: AbortSignal;
  wait: true;
}

export interface ModelOwnership {
  setReleaseHandler(handler: () => void): void;
  setCacheDeletedHandler(handler: () => void): void;
  acquire(options?: OwnershipAcquireOptions): Promise<OwnershipStatus>;
  release(): void;
  acquireForDeletion(): Promise<boolean>;
  notifyCacheDeleted(): void;
  dispose(): void;
}

type OwnershipMessage =
  | { type: 'release-request'; from: string; requestId: string }
  | { type: 'released'; from: string; requestId: string }
  | {
      type: 'cache-deleted';
      from: string;
      modelCache: string;
      runtimeCache: string;
    };

const LOCK_NAME = 'magic-box-local-ai-model';
const CHANNEL_NAME = 'magic-box-local-ai';
const DELETE_WAIT_MS = 2_000;

export class LocalAIModelOwnership implements ModelOwnership {
  private readonly id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  private channel: BroadcastChannel | null = null;
  private releaseLock: (() => void) | null = null;
  private leaseType: 'model' | 'deletion' | null = null;
  private leaseId: symbol | null = null;
  private lockTask: Promise<void> | null = null;
  private requestSequence = 0;
  private releaseHandler = () => {};
  private cacheDeletedHandler = () => {};

  setReleaseHandler(handler: () => void): void {
    this.releaseHandler = handler;
    this.openChannel();
  }

  setCacheDeletedHandler(handler: () => void): void {
    this.cacheDeletedHandler = handler;
    this.openChannel();
  }

  async acquire(options?: OwnershipAcquireOptions): Promise<OwnershipStatus> {
    return this.requestLease('model', options);
  }

  private async requestLease(
    type: 'model' | 'deletion',
    options?: OwnershipAcquireOptions,
  ): Promise<OwnershipStatus> {
    if (this.releaseLock) {
      return this.leaseType === type ? 'acquired' : 'busy';
    }
    this.openChannel();
    const locks =
      typeof navigator === 'undefined' ? undefined : navigator.locks;
    if (!locks) return 'unsupported';

    let resolveAcquired: (status: OwnershipStatus) => void = () => {};
    const acquired = new Promise<OwnershipStatus>((resolve) => {
      resolveAcquired = resolve;
    });
    let unlock: () => void = () => {};
    const held = new Promise<void>((resolve) => {
      unlock = resolve;
    });
    const leaseId = Symbol(type);
    const lockOptions: LockOptions = options
      ? { mode: 'exclusive', signal: options.signal }
      : { mode: 'exclusive', ifAvailable: true };
    const task = locks
      .request(LOCK_NAME, lockOptions, async (lock) => {
        if (!lock) {
          resolveAcquired('busy');
          return;
        }
        this.leaseId = leaseId;
        this.leaseType = type;
        this.releaseLock = unlock;
        resolveAcquired('acquired');
        await held;
        if (this.leaseId === leaseId) {
          this.releaseLock = null;
          this.leaseType = null;
          this.leaseId = null;
        }
      })
      .catch(() =>
        resolveAcquired(options?.signal.aborted ? 'busy' : 'unsupported'),
      );
    this.lockTask = task;
    void task.then(() => {
      if (this.lockTask === task) this.lockTask = null;
    });

    const status = await acquired;
    if (status !== 'acquired') await task;
    return status;
  }

  release(): void {
    const unlock = this.releaseLock;
    this.releaseLock = null;
    this.leaseType = null;
    this.leaseId = null;
    unlock?.();
  }

  async acquireForDeletion(): Promise<boolean> {
    this.release();
    if (this.lockTask) await this.lockTask;
    const channel = this.openChannel();
    if (typeof navigator === 'undefined' || !navigator.locks) return false;
    channel?.postMessage({
      type: 'release-request',
      from: this.id,
      requestId: `${this.id}-${++this.requestSequence}`,
    } satisfies OwnershipMessage);

    const deadline = Date.now() + DELETE_WAIT_MS;
    while (Date.now() < deadline) {
      const status = await this.requestLease('deletion');
      if (status === 'acquired') return true;
      if (status === 'unsupported') return false;
      await new Promise<void>((resolve) => setTimeout(resolve, 100));
    }
    return false;
  }

  notifyCacheDeleted(): void {
    if (this.leaseType !== 'deletion') return;
    this.openChannel()?.postMessage({
      type: 'cache-deleted',
      from: this.id,
      modelCache: MODEL_CACHE,
      runtimeCache: RUNTIME_CACHE,
    } satisfies OwnershipMessage);
  }

  dispose(): void {
    this.release();
    this.channel?.close();
    this.channel = null;
  }

  private openChannel(): BroadcastChannel | null {
    if (this.channel) return this.channel;
    if (typeof BroadcastChannel === 'undefined') return null;
    try {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
    } catch {
      return null;
    }
    this.channel.onmessage = (event: MessageEvent<OwnershipMessage>) => {
      const message = event.data;
      if (!message || message.from === this.id) {
        return;
      }
      if (message.type === 'cache-deleted') {
        if (
          message.modelCache === MODEL_CACHE &&
          message.runtimeCache === RUNTIME_CACHE
        ) {
          this.cacheDeletedHandler();
        }
        return;
      }
      if (message.type === 'release-request') {
        this.releaseHandler();
        this.channel?.postMessage({
          type: 'released',
          from: this.id,
          requestId: message.requestId,
        } satisfies OwnershipMessage);
      }
    };
    return this.channel;
  }
}
