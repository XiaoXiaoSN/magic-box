import { buildVersion, serviceWorkerUrl } from '@global/buildInfo';

const CACHE_NAME = 'magic-box-offline-tools-v1';
const MANIFEST_URL = '/offline-tool-pack.json';
const ASSET_PATH =
  /^\/assets\/[A-Za-z0-9_.-]+-[A-Za-z0-9_-]{8}\.(?:css|js|wasm)$/;

export interface ToolPack {
  version: string;
  assets: { url: string; bytes: number }[];
}

export interface ToolPackStatus {
  controlled: boolean;
  pack: ToolPack | null;
  installed: boolean;
  ready: boolean;
}

function parseToolPack(raw: unknown): ToolPack | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const result = raw as Partial<ToolPack>;
  if (
    result.version !== buildVersion ||
    !Array.isArray(result.assets) ||
    !result.assets.length
  )
    return null;
  const paths = new Set<string>();
  for (const asset of result.assets) {
    if (
      !asset ||
      typeof asset.url !== 'string' ||
      !ASSET_PATH.test(asset.url) ||
      !Number.isSafeInteger(asset.bytes) ||
      asset.bytes <= 0 ||
      paths.has(asset.url)
    )
      return null;
    paths.add(asset.url);
  }
  return { version: result.version, assets: result.assets };
}

function isAssetResponse(
  url: string,
  response: Response | undefined,
): response is Response {
  if (!response?.ok) return false;
  const type = response.headers.get('content-type')?.split(';', 1)[0].trim();
  if (url.endsWith('.wasm')) return type === 'application/wasm';
  if (url.endsWith('.css')) return type === 'text/css';
  return (
    type === 'text/javascript' ||
    type === 'application/javascript' ||
    type === 'application/ecmascript'
  );
}

export function supportsOfflineTools(): boolean {
  return typeof caches !== 'undefined' && 'serviceWorker' in navigator;
}

function controlsThisBuild(): boolean {
  return (
    navigator.serviceWorker.controller?.scriptURL ===
    new URL(serviceWorkerUrl, location.origin).href
  );
}

export async function inspectToolPack(): Promise<ToolPackStatus> {
  const controlled = controlsThisBuild();
  const installed = await caches.has(CACHE_NAME);
  let pack: ToolPack | null = null;
  if (installed) {
    const cache = await caches.open(CACHE_NAME);
    const stored = await cache.match(MANIFEST_URL);
    pack = stored ? parseToolPack(await stored.json().catch(() => null)) : null;
    if (pack && controlled) {
      const present = await Promise.all(
        pack.assets.map(async ({ url }) =>
          isAssetResponse(url, await cache.match(url)),
        ),
      );
      if (present.every(Boolean))
        return { controlled, pack, installed, ready: true };
    }
  }
  if (!pack) {
    try {
      const response = await fetch(MANIFEST_URL, { cache: 'no-store' });
      if (response.ok) pack = parseToolPack(await response.json());
    } catch {
      // An existing installation can still be removed or inspected offline.
    }
  }
  return { controlled, pack, installed, ready: false };
}

function withPackLock<T>(work: () => Promise<T>): Promise<T> {
  return navigator.locks ? navigator.locks.request(CACHE_NAME, work) : work();
}

export function installToolPack(
  pack: ToolPack,
  signal: AbortSignal,
  onProgress: (done: number) => void,
): Promise<void> {
  return withPackLock(async () => {
    signal.throwIfAborted();
    if (!controlsThisBuild()) throw new Error('Service worker update required');
    const cache = await caches.open(CACHE_NAME);
    await cache.delete(MANIFEST_URL);
    for (const [index, asset] of pack.assets.entries()) {
      signal.throwIfAborted();
      if (!isAssetResponse(asset.url, await cache.match(asset.url))) {
        // Fetch directly so installation populates only the pack's cache.
        const response = await fetch(`${asset.url}?offline-pack=1`, {
          cache: 'no-store',
          signal,
        });
        if (!isAssetResponse(asset.url, response))
          throw new Error('An offline asset could not be downloaded');
        const headers = new Headers(response.headers);
        headers.delete('content-encoding');
        headers.delete('content-length');
        await cache.put(
          asset.url,
          new Response(response.body, { headers, status: response.status }),
        );
      }
      onProgress(index + 1);
    }
    const retained = new Set(
      pack.assets.map(({ url }) => new URL(url, location.origin).href),
    );
    for (const request of await cache.keys()) {
      if (!retained.has(request.url)) await cache.delete(request);
    }
    signal.throwIfAborted();
    await cache.put(
      MANIFEST_URL,
      new Response(JSON.stringify(pack), {
        headers: { 'content-type': 'application/json' },
      }),
    );
  });
}

export function removeToolPack(): Promise<boolean> {
  return withPackLock(() => caches.delete(CACHE_NAME));
}
