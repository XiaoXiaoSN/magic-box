import { afterEach, describe, expect, it, vi } from 'vitest';

import { CACHE_LOCK_NAME, handleWithCacheAccess } from '../cacheAccess';
import { deleteLocalAIDownloads } from '../caches';
import { LocalAIClient } from '../client';
import {
  MODEL_CACHE,
  RUNTIME_CACHE,
  RUNTIME_FETCH_URL,
  RUNTIME_URL,
  RUNTIME_VERSION,
} from '../modelCatalog';
import { LocalAIModelOwnership } from '../ownership';
import type { TransformersRuntime } from '../runtime';
import type { AICommand, AIEvent } from '../types';
import { createLocks, TestBroadcastChannel } from './fakeWebLocks';
import { FakeWorker } from './fakeWorker';

vi.mock('../runtime', async (importOriginal) => {
  const runtime = await importOriginal<typeof import('../runtime')>();
  return {
    ...runtime,
    loadRuntime: (cacheOnly?: boolean) =>
      runtime.loadRuntime(cacheOnly, {
        importModule: async () =>
          ({
            env: { version: RUNTIME_VERSION, backends: { onnx: { wasm: {} } } },
            LogLevel: { NONE: 0 },
          }) as TransformersRuntime,
        createObjectURL: () => 'blob:local-ai-test',
        revokeObjectURL: () => {},
      }),
  };
});

afterEach(() => {
  TestBroadcastChannel.channels.clear();
  vi.unstubAllGlobals();
  vi.useRealTimers();
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
    expect(await deleter.acquire()).toBe('busy');
    expect(released).toHaveBeenCalledOnce();
    owner.dispose();
    deleter.release();
    deleter.dispose();
  });

  it('does not treat a deletion lease as a model lease', async () => {
    vi.stubGlobal('navigator', { locks: createLocks() });
    vi.stubGlobal(
      'BroadcastChannel',
      TestBroadcastChannel as unknown as typeof BroadcastChannel,
    );
    const ownership = new LocalAIModelOwnership();

    expect(await ownership.acquireForDeletion()).toBe(true);
    expect(await ownership.acquire()).toBe('busy');
    ownership.release();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(await ownership.acquire()).toBe('acquired');
    ownership.dispose();
  });

  it('keeps a new peer from creating or writing caches after deletion enumerates them', async () => {
    const locks = createLocks();
    const requestLock = vi.spyOn(locks, 'request');
    vi.stubGlobal('isSecureContext', true);
    vi.stubGlobal('navigator', {
      locks,
      gpu: {
        requestAdapter: async () => ({ features: new Set(['shader-f16']) }),
      },
    });
    vi.stubGlobal('BroadcastChannel', TestBroadcastChannel);
    const deleteStarted = Promise.withResolvers<void>();
    const finishDelete = Promise.withResolvers<void>();
    const names = new Set(['magic-box-local-ai-runtime-v1', 'another-feature']);
    const put = vi.fn(async (_key: string, _response: Response) => {});
    const open = vi.fn(async (name: string) => {
      names.add(name);
      return { match: async () => undefined, put };
    });
    const fetchRuntime = vi.fn(async () => new Response('fixture runtime'));
    vi.stubGlobal('fetch', fetchRuntime);
    vi.stubGlobal('caches', {
      open,
      match: async () => undefined,
      keys: async () => [...names],
      delete: async (name: string) => {
        deleteStarted.resolve();
        await finishDelete.promise;
        return names.delete(name);
      },
    });

    const deleter = new LocalAIClient(
      () => new FakeWorker(),
      new LocalAIModelOwnership(),
    );
    const releaseDeletion = await deleter.acquireDeletionLease();
    expect(releaseDeletion).toEqual(expect.any(Function));
    const removing = deleteLocalAIDownloads();
    await deleteStarted.promise;

    const worker = new FakeWorker();
    const inspected = Promise.withResolvers<AIEvent>();
    const register =
      vi.fn<
        (
          type: string,
          handler: (event: MessageEvent<AICommand>) => void,
        ) => void
      >();
    vi.stubGlobal('addEventListener', register);
    vi.stubGlobal('close', vi.fn());
    vi.stubGlobal('postMessage', (data: AIEvent) => {
      worker.onmessage?.(new MessageEvent('message', { data }));
      inspected.resolve(data);
    });
    await import('../inference.worker');
    const receive = register.mock.calls.find(
      ([type]) => type === 'message',
    )?.[1];
    expect(receive).toEqual(expect.any(Function));
    vi.spyOn(worker, 'postMessage').mockImplementation((command) => {
      receive?.(new MessageEvent('message', { data: command }));
    });
    const peer = new LocalAIClient(() => worker, new LocalAIModelOwnership());
    try {
      expect(peer.inspect()).toBe(true);
      expect(requestLock).toHaveBeenCalledWith(
        CACHE_LOCK_NAME,
        { mode: 'shared' },
        expect.any(Function),
      );
      await Promise.resolve();
      expect(open).not.toHaveBeenCalled();
      expect(put).not.toHaveBeenCalled();
      expect(fetchRuntime).not.toHaveBeenCalled();

      // An unmount can dispose the client before its storage action completes.
      deleter.dispose();
      finishDelete.resolve();
      await removing;
      expect([...names]).toEqual(['another-feature']);
      expect(open).not.toHaveBeenCalled();
      expect(put).not.toHaveBeenCalled();
      expect(fetchRuntime).not.toHaveBeenCalled();

      releaseDeletion?.();
      expect(await inspected.promise).toMatchObject({ type: 'available' });
      expect([...names]).toEqual([
        'another-feature',
        MODEL_CACHE,
        RUNTIME_CACHE,
      ]);
      expect(put).toHaveBeenCalledExactlyOnceWith(
        RUNTIME_URL,
        expect.any(Response),
      );
      expect(fetchRuntime).toHaveBeenCalledExactlyOnceWith(
        RUNTIME_FETCH_URL,
        undefined,
      );
      expect(peer.getSnapshot().phase).toBe('available');
    } finally {
      finishDelete.resolve();
      releaseDeletion?.();
      await removing;
      peer.dispose();
      deleter.dispose();
    }
  });

  it('allows peer inspection while a different tab merely owns the model', async () => {
    vi.stubGlobal('navigator', { locks: createLocks() });
    vi.stubGlobal('BroadcastChannel', TestBroadcastChannel);
    const owner = new LocalAIModelOwnership();
    const worker = new FakeWorker();
    const run = vi.fn(async () => {
      worker.reply({ type: 'available', info: { bytes: 500, cached: true } });
    });
    let inspecting = Promise.resolve();
    const post = worker.postMessage.bind(worker);
    vi.spyOn(worker, 'postMessage').mockImplementation((command) => {
      post(command);
      inspecting = handleWithCacheAccess(command, run, vi.fn());
    });
    const peer = new LocalAIClient(() => worker, new LocalAIModelOwnership());
    try {
      expect(await owner.acquire()).toBe('acquired');
      expect(peer.inspect()).toBe(true);
      await inspecting;
      expect(run).toHaveBeenCalledOnce();
      expect(peer.getSnapshot().info?.cached).toBe(true);
      peer.prepare();
      await vi.waitFor(() => expect(peer.getSnapshot().error).toBe('busy'));
      expect(worker.commands).toEqual([{ type: 'inspect', id: 1 }]);
    } finally {
      peer.dispose();
      owner.dispose();
    }
  });

  it('times out waiting for a running cache operation and releases its model lock', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('navigator', { locks: createLocks() });
    vi.stubGlobal('BroadcastChannel', TestBroadcastChannel);
    const started = Promise.withResolvers<void>();
    const finish = Promise.withResolvers<void>();
    const operation = handleWithCacheAccess(
      { type: 'inspect', id: 1 },
      async () => {
        started.resolve();
        await finish.promise;
      },
      vi.fn(),
    );
    const deleter = new LocalAIModelOwnership();
    const peer = new LocalAIModelOwnership();
    try {
      await started.promise;
      const pending = deleter.acquireForDeletion();
      await vi.advanceTimersByTimeAsync(2_000);
      expect(await pending).toBe(false);
      expect(await peer.acquire()).toBe('acquired');
    } finally {
      finish.resolve();
      await operation;
      peer.dispose();
      deleter.dispose();
    }
  });

  it('returns immediately with a safe unsupported result when Web Locks are missing', async () => {
    vi.stubGlobal('navigator', {});
    const ownership = new LocalAIModelOwnership();
    await expect(ownership.acquire()).resolves.toBe('unsupported');
    await expect(ownership.acquireForDeletion()).resolves.toBe(false);
    ownership.dispose();
  });
});
