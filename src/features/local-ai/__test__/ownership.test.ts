import { afterEach, describe, expect, it, vi } from 'vitest';

import { LocalAIModelOwnership } from '../ownership';

class TestBroadcastChannel {
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

const createLocks = () => {
  let held = false;
  return {
    request: async (
      _name: string,
      _options: unknown,
      callback: (lock: Lock | null) => Promise<void>,
    ) => {
      if (held) return callback(null);
      held = true;
      try {
        await callback({} as Lock);
      } finally {
        held = false;
      }
    },
  } as unknown as LockManager;
};

afterEach(() => {
  TestBroadcastChannel.channels.clear();
  vi.unstubAllGlobals();
});

describe('LocalAIModelOwnership', () => {
  it('allows only one tab to hold the model lock', async () => {
    vi.stubGlobal('navigator', { locks: createLocks() });
    vi.stubGlobal(
      'BroadcastChannel',
      TestBroadcastChannel as unknown as typeof BroadcastChannel,
    );
    const first = new LocalAIModelOwnership();
    const second = new LocalAIModelOwnership();

    expect(await first.acquire()).toBe('acquired');
    expect(await second.acquire()).toBe('busy');
    first.release();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(await second.acquire()).toBe('acquired');
    second.dispose();
    first.dispose();
  });

  it('asks the existing tab to release before granting the deletion lease', async () => {
    vi.stubGlobal('navigator', { locks: createLocks() });
    vi.stubGlobal(
      'BroadcastChannel',
      TestBroadcastChannel as unknown as typeof BroadcastChannel,
    );
    const owner = new LocalAIModelOwnership();
    const deleter = new LocalAIModelOwnership();
    const released = vi.fn(() => owner.release());
    owner.setReleaseHandler(released);

    expect(await owner.acquire()).toBe('acquired');
    const lease = await deleter.acquireForDeletion();
    expect(lease).toBe(true);
    expect(released).toHaveBeenCalledOnce();
    owner.dispose();
    deleter.release();
    deleter.dispose();
  });

  it('returns immediately with a safe unsupported result when Web Locks are missing', async () => {
    vi.stubGlobal('navigator', {});
    const ownership = new LocalAIModelOwnership();
    await expect(ownership.acquire()).resolves.toBe('unsupported');
    await expect(ownership.acquireForDeletion()).resolves.toBe(false);
    ownership.dispose();
  });
});
