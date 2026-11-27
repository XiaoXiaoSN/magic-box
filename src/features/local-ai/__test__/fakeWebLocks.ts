export class TestBroadcastChannel {
  static channels = new Set<TestBroadcastChannel>();
  onmessage: ((event: MessageEvent) => void) | null = null;

  constructor(_name: string) {
    TestBroadcastChannel.channels.add(this);
  }

  postMessage(data: unknown): void {
    for (const channel of TestBroadcastChannel.channels) {
      if (channel === this) continue;
      queueMicrotask(() => channel.onmessage?.({ data } as MessageEvent));
    }
  }

  close(): void {
    TestBroadcastChannel.channels.delete(this);
  }
}

interface WaitingLock {
  mode: LockMode;
  grant: () => void;
}

interface LockQueue {
  held: Set<WaitingLock>;
  waiting: WaitingLock[];
}

function canGrant(queue: LockQueue, mode: LockMode): boolean {
  return (
    !queue.held.size ||
    (mode === 'shared' &&
      [...queue.held].every((lock) => lock.mode === 'shared'))
  );
}

function grantWaiting(queue: LockQueue): void {
  for (
    let next = queue.waiting[0];
    next && canGrant(queue, next.mode);
    next = queue.waiting[0]
  ) {
    queue.waiting.shift();
    next.grant();
  }
}

export function createLocks(): LockManager {
  const queues = new Map<string, LockQueue>();
  return {
    request: (
      name: string,
      options: LockOptions,
      callback: (lock: Lock | null) => Promise<void>,
    ): Promise<void> => {
      const queue = queues.get(name) ?? {
        held: new Set<WaitingLock>(),
        waiting: [],
      };
      queues.set(name, queue);
      const mode = options.mode ?? 'exclusive';
      if (
        options.ifAvailable &&
        (queue.waiting.length || !canGrant(queue, mode))
      ) {
        return callback(null);
      }
      return new Promise<void>((resolve, reject) => {
        const cancel = (): void => {
          const index = queue.waiting.indexOf(request);
          if (index >= 0) queue.waiting.splice(index, 1);
          reject(new DOMException('Aborted', 'AbortError'));
          grantWaiting(queue);
        };
        const request: WaitingLock = {
          mode,
          grant: () => {
            options.signal?.removeEventListener('abort', cancel);
            queue.held.add(request);
            const release = (): void => {
              queue.held.delete(request);
              grantWaiting(queue);
            };
            void Promise.resolve()
              .then(() => callback({ name, mode }))
              .then(
                () => {
                  release();
                  resolve();
                },
                (error: unknown) => {
                  release();
                  reject(error);
                },
              );
          },
        };
        if (options.signal?.aborted) {
          cancel();
          return;
        }
        options.signal?.addEventListener('abort', cancel, { once: true });
        queue.waiting.push(request);
        grantWaiting(queue);
      });
    },
  } as unknown as LockManager;
}
