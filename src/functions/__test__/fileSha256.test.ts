// @vitest-environment node

import { createHash, webcrypto } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  compareSha256,
  hashFileSha256,
  MAX_HASH_FILE_BYTES,
} from '../fileSha256';

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

  it('compares an expected digest ignoring case and surrounding whitespace', () => {
    const digest = 'ab'.repeat(32);
    expect(compareSha256(digest, digest)).toBe('match');
    expect(compareSha256(`  ${digest.toUpperCase()}\r\n`, digest)).toBe(
      'match',
    );
    // The text of a `.sha256` file downloaded from the file hasher.
    expect(compareSha256(`${digest}\n`, digest)).toBe('match');
    expect(compareSha256('cd'.repeat(32), digest)).toBe('mismatch');
    expect(compareSha256('ab'.repeat(31), digest)).toBe('invalid');
    expect(compareSha256(`${digest}0`, digest)).toBe('invalid');
    expect(compareSha256('zz'.repeat(32), digest)).toBe('invalid');
    expect(compareSha256(`${digest}  file.bin`, digest)).toBe('invalid');
    expect(compareSha256('', digest)).toBe('invalid');
  });
});
