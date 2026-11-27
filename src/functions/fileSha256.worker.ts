import { type FileHashResult, hashFileSha256 } from './fileSha256';

self.addEventListener('message', async (event: MessageEvent<File>) => {
  let result: FileHashResult;
  try {
    result = { ok: true, digest: await hashFileSha256(event.data) };
  } catch {
    result = { ok: false };
  }
  self.postMessage(result);
});
