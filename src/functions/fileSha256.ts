import { digestHex } from './digest';

export const MAX_HASH_FILE_BYTES = 32 * 1024 * 1024;

export type FileHashResult = { ok: true; digest: string } | { ok: false };

export async function hashFileSha256(file: Blob): Promise<string> {
  if (file.size > MAX_HASH_FILE_BYTES) throw new Error('File is too large');
  // The worker reads the original bytes once, without creating a text copy.
  return digestHex('SHA-256', await file.arrayBuffer());
}

export type Sha256Comparison = 'match' | 'mismatch' | 'invalid';

const SHA256_HEX = /^[0-9a-f]{64}$/;

/**
 * Compares a pasted digest, or the text of a `.sha256` file from this tool,
 * with a computed digest. Surrounding whitespace and letter case are ignored.
 */
export function compareSha256(
  expected: string,
  digest: string,
): Sha256Comparison {
  const normalized = expected.trim().toLowerCase();
  if (!SHA256_HEX.test(normalized)) return 'invalid';
  return normalized === digest.toLowerCase() ? 'match' : 'mismatch';
}
