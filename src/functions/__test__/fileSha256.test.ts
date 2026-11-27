// @vitest-environment node

import { createHash, webcrypto } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { hashFileSha256, MAX_HASH_FILE_BYTES } from '../fileSha256';

afterEach(() => vi.unstubAllGlobals());

describe('file SHA-256', () => {
  it('hashes original binary bytes including BOM, NUL and invalid UTF-8', async () => {
    vi.stubGlobal('crypto', webcrypto);
    const bytes = Uint8Array.of(0xef, 0xbb, 0xbf, 0, 0xfe, 0xff, 13, 10);
    const expected = createHash('sha256').update(bytes).digest('hex');
    await expect(hashFileSha256(new Blob([bytes]))).resolves.toBe(expected);
    await expect(hashFileSha256(new Blob())).resolves.toBe(
      createHash('sha256').digest('hex'),
    );
  });

  it('rejects oversized input before reading it into memory', async () => {
    const file = { size: MAX_HASH_FILE_BYTES + 1, arrayBuffer: vi.fn() };
    await expect(hashFileSha256(file as unknown as Blob)).rejects.toThrow(
      'File is too large',
    );
    expect(file.arrayBuffer).not.toHaveBeenCalled();
  });
});
