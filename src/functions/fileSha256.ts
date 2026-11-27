import { digestHex } from './digest';

export const MAX_HASH_FILE_BYTES = 32 * 1024 * 1024;

export type FileHashResult = { ok: true; digest: string } | { ok: false };

export async function hashFileSha256(file: Blob): Promise<string> {
  if (file.size > MAX_HASH_FILE_BYTES) throw new Error('File is too large');
  // The worker reads the original bytes once, without creating a text copy.
  return digestHex('SHA-256', await file.arrayBuffer());
}
