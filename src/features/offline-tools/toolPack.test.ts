import { buildVersion, serviceWorkerUrl } from '@global/buildInfo';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  inspectToolPack,
  installToolPack,
  removeToolPack,
  type ToolPack,
} from './toolPack';

const cacheName = 'magic-box-offline-tools-v1';
const manifestUrl = '/offline-tool-pack.json';
const assetUrl = '/assets/compute.worker-1234abcd.js';
const pack: ToolPack = {
  version: buildVersion,
  assets: [{ url: assetUrl, bytes: 12 }],
};
const storage = new Map<string, Response>();
let exists = false;
let workerDescriptor: PropertyDescriptor | undefined;

function absolute(url: string) {
  return new URL(url, location.origin).href;
}

beforeEach(() => {
  storage.clear();
  exists = false;
  workerDescriptor = Object.getOwnPropertyDescriptor(
    navigator,
    'serviceWorker',
  );
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { controller: { scriptURL: absolute(serviceWorkerUrl) } },
  });
  vi.stubGlobal('caches', {
    has: async (name: string) => name === cacheName && exists,
    open: async () => {
      exists = true;
      return {
        match: async (request: string) =>
          storage.get(absolute(request))?.clone(),
        put: async (request: string, response: Response) =>
          storage.set(absolute(request), response),
        delete: async (request: string | Request) =>
          storage.delete(
            typeof request === 'string' ? absolute(request) : request.url,
          ),
        keys: async () => [...storage.keys()].map((url) => new Request(url)),
      };
    },
    delete: vi.fn(async (name: string) => {
      if (name !== cacheName) return false;
      exists = false;
      storage.clear();
      return true;
    }),
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) =>
      url === manifestUrl
        ? Response.json(pack)
        : new Response('export {};', {
            headers: { 'content-type': 'text/javascript' },
          }),
    ),
  );
});

afterEach(() => {
  if (workerDescriptor)
    Object.defineProperty(navigator, 'serviceWorker', workerDescriptor);
  else Reflect.deleteProperty(navigator, 'serviceWorker');
  vi.unstubAllGlobals();
});

describe('offline tool pack', () => {
  it('only reports Ready when the current controller and every asset match', async () => {
    expect(await inspectToolPack()).toEqual({
      controlled: true,
      installed: false,
      ready: false,
      pack,
    });
    const progress = vi.fn();
    await installToolPack(pack, new AbortController().signal, progress);
    expect(fetch).toHaveBeenCalledWith(
      `${assetUrl}?offline-pack=1`,
      expect.objectContaining({ cache: 'no-store' }),
    );
    expect(progress).toHaveBeenCalledWith(1);
    expect((await inspectToolPack()).ready).toBe(true);

    storage.delete(absolute(assetUrl));
    expect((await inspectToolPack()).ready).toBe(false);
    await removeToolPack();
    expect(caches.delete).toHaveBeenCalledExactlyOnceWith(cacheName);
    expect((await inspectToolPack()).installed).toBe(false);
  });

  it('rejects a wrong asset type and an interrupted run without marking the cache Ready', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response('<html>fallback</html>', {
        headers: { 'content-type': 'text/html' },
      }),
    );
    await expect(
      installToolPack(pack, new AbortController().signal, vi.fn()),
    ).rejects.toThrow('could not be downloaded');
    expect(storage.has(absolute(manifestUrl))).toBe(false);
    await expect(
      installToolPack(pack, AbortSignal.abort(), vi.fn()),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect((await inspectToolPack()).ready).toBe(false);
  });

  it('invalidates installed metadata from an older build', async () => {
    exists = true;
    storage.set(
      absolute(manifestUrl),
      Response.json({ ...pack, version: 'older' }),
    );
    vi.mocked(fetch).mockRejectedValueOnce(new Error('offline'));
    expect(await inspectToolPack()).toEqual({
      controlled: true,
      installed: true,
      ready: false,
      pack: null,
    });
  });
});
