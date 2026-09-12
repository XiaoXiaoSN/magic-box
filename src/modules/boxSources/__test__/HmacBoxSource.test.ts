import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { HmacBoxSource } from '../HmacBoxSource';

// canonical test message and key used across most test cases
const MESSAGE = 'The quick brown fox jumps over the lazy dog';
const KEY = 'key';

// well-known HMAC vectors for message=MESSAGE, key=KEY (Wikipedia; verified
// against node:crypto createHmac)
const EXPECTED_SHA256 =
  'f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8';
const EXPECTED_SHA1 = 'de7c9b85b8b78aa6bc8a7a36f70a90701c9db4d9';
const EXPECTED_SHA512 =
  'b42af09057bac1e2d41708e48a902e09b5ff7f12ab428a4fe86653c73dd248fb82f948a549f7b791a5b41915ee4d1ec3935357e4e2317250d0372afa2ebeeb3a';
// HMAC-SHA256(key='key', message='')
const EXPECTED_SHA256_EMPTY =
  '5d5d139563c95b5967b9bd9a8c9b233a9dedb45072794cd232dc1b74832607d0';

const optionsOf = (
  boxes: Awaited<ReturnType<typeof HmacBoxSource.generateBoxes>>,
) => (boxes[0].props.options ?? {}) as Record<string, string>;

describe('HmacBoxSource', () => {
  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(HmacBoxSource.name).toBe('HMAC');
      expect(HmacBoxSource.tag).toBe('#');
      expect(HmacBoxSource.kind).toBe('Encode');
      expect(HmacBoxSource.priority).toBe(10);
      expect(HmacBoxSource.defaultDisabled).toBe(true);
    });
  });

  describe('generateBoxes — no trigger option', () => {
    it('returns empty array when no option is provided (null)', async () => {
      const boxes = await HmacBoxSource.generateBoxes(MESSAGE, null);
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty options object', async () => {
      const boxes = await HmacBoxSource.generateBoxes(MESSAGE, {});
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array when unrelated option is set', async () => {
      const boxes = await HmacBoxSource.generateBoxes(MESSAGE, {
        base64: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('does NOT trigger on bare ::sha256 (that is the plain Hash box)', async () => {
      const boxes = await HmacBoxSource.generateBoxes(MESSAGE, {
        sha256: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('does NOT trigger on bare ::sha1 ::sha512 without a key', async () => {
      const boxes = await HmacBoxSource.generateBoxes(MESSAGE, {
        sha1: true,
        sha512: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes — bare ::hmac (no key) → usage box', () => {
    it('returns a usage hint box when ::hmac has no value', async () => {
      const boxes = await HmacBoxSource.generateBoxes(MESSAGE, { hmac: true });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('HMAC');
      expect(boxes[0].props.plaintextOutput).toMatch(/provide a key/i);
      // errorBox leaves the template undefined so the web layer falls back
      // to DefaultBoxTemplate and the headless layer prints the message
      expect(boxes[0].boxTemplate).toBeUndefined();
      expect(boxes[0].props.showExpandButton).toBe(false);
    });

    it('returns a usage hint box for bare ::hmac ::sha256', async () => {
      const boxes = await HmacBoxSource.generateBoxes(MESSAGE, {
        hmac: true,
        sha256: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/provide a key/i);
    });

    it('returns a usage hint box for bare ::hmacsha256', async () => {
      const boxes = await HmacBoxSource.generateBoxes(MESSAGE, {
        hmacsha256: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/provide a key/i);
    });
  });

  describe('generateBoxes — ::hmac=<key> computes all algorithms', () => {
    it('produces the canonical HMAC-SHA256 / SHA1 / SHA512 digests', async () => {
      const boxes = await HmacBoxSource.generateBoxes(MESSAGE, { hmac: KEY });
      expect(boxes).toHaveLength(1);
      const opts = optionsOf(boxes);
      expect(opts['HMAC-SHA256']).toBe(EXPECTED_SHA256);
      expect(opts['HMAC-SHA1']).toBe(EXPECTED_SHA1);
      expect(opts['HMAC-SHA512']).toBe(EXPECTED_SHA512);
    });

    it('options record contains all four expected keys in order', async () => {
      const boxes = await HmacBoxSource.generateBoxes(MESSAGE, { hmac: KEY });
      expect(Object.keys(optionsOf(boxes))).toEqual([
        'HMAC-SHA256',
        'HMAC-SHA1',
        'HMAC-SHA512',
        'Key Length',
      ]);
    });
  });

  describe('generateBoxes — algorithm selection', () => {
    it('::hmac=<key> ::sha256 outputs only HMAC-SHA256', async () => {
      const boxes = await HmacBoxSource.generateBoxes(MESSAGE, {
        hmac: KEY,
        sha256: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = optionsOf(boxes);
      expect(Object.keys(opts)).toEqual(['HMAC-SHA256', 'Key Length']);
      expect(opts['HMAC-SHA256']).toBe(EXPECTED_SHA256);
    });

    it('::hmac=<key> ::sha1 ::sha512 outputs both, in canonical order', async () => {
      const boxes = await HmacBoxSource.generateBoxes(MESSAGE, {
        hmac: KEY,
        sha512: true,
        sha1: true,
      });
      const opts = optionsOf(boxes);
      expect(Object.keys(opts)).toEqual([
        'HMAC-SHA1',
        'HMAC-SHA512',
        'Key Length',
      ]);
      expect(opts['HMAC-SHA1']).toBe(EXPECTED_SHA1);
      expect(opts['HMAC-SHA512']).toBe(EXPECTED_SHA512);
    });

    it('::hmacsha256=<key> selects SHA-256 only', async () => {
      const boxes = await HmacBoxSource.generateBoxes(MESSAGE, {
        hmacsha256: KEY,
      });
      expect(boxes).toHaveLength(1);
      const opts = optionsOf(boxes);
      expect(Object.keys(opts)).toEqual(['HMAC-SHA256', 'Key Length']);
      expect(opts['HMAC-SHA256']).toBe(EXPECTED_SHA256);
    });

    it('::hmacsha1=<key> and ::hmacsha512=<key> select their algorithm', async () => {
      const sha1 = await HmacBoxSource.generateBoxes(MESSAGE, {
        hmacsha1: KEY,
      });
      expect(Object.keys(optionsOf(sha1))).toEqual(['HMAC-SHA1', 'Key Length']);
      expect(optionsOf(sha1)['HMAC-SHA1']).toBe(EXPECTED_SHA1);

      const sha512 = await HmacBoxSource.generateBoxes(MESSAGE, {
        hmacsha512: KEY,
      });
      expect(Object.keys(optionsOf(sha512))).toEqual([
        'HMAC-SHA512',
        'Key Length',
      ]);
      expect(optionsOf(sha512)['HMAC-SHA512']).toBe(EXPECTED_SHA512);
    });
  });

  describe('generateBoxes — sha option carrying the key', () => {
    it('::sha256=<key> alone triggers HMAC-SHA256 with that key', async () => {
      const boxes = await HmacBoxSource.generateBoxes(MESSAGE, {
        sha256: KEY,
      });
      expect(boxes).toHaveLength(1);
      const opts = optionsOf(boxes);
      expect(Object.keys(opts)).toEqual(['HMAC-SHA256', 'Key Length']);
      expect(opts['HMAC-SHA256']).toBe(EXPECTED_SHA256);
    });

    it('::sha512=<key> alone triggers HMAC-SHA512 with that key', async () => {
      const boxes = await HmacBoxSource.generateBoxes(MESSAGE, {
        sha512: KEY,
      });
      const opts = optionsOf(boxes);
      expect(Object.keys(opts)).toEqual(['HMAC-SHA512', 'Key Length']);
      expect(opts['HMAC-SHA512']).toBe(EXPECTED_SHA512);
    });

    it('bare ::hmac takes the key from ::sha1=<key>', async () => {
      const boxes = await HmacBoxSource.generateBoxes(MESSAGE, {
        hmac: true,
        sha1: KEY,
      });
      const opts = optionsOf(boxes);
      expect(Object.keys(opts)).toEqual(['HMAC-SHA1', 'Key Length']);
      expect(opts['HMAC-SHA1']).toBe(EXPECTED_SHA1);
    });

    it('::hmac=<key> wins over a differing ::sha256=<other>', async () => {
      const boxes = await HmacBoxSource.generateBoxes(MESSAGE, {
        hmac: KEY,
        sha256: 'other',
      });
      const opts = optionsOf(boxes);
      expect(opts['HMAC-SHA256']).toBe(EXPECTED_SHA256);
      expect(opts['Key Length']).toBe('3');
    });
  });

  describe('generateBoxes — Key Length field', () => {
    it('reports key byte length as "3" for key "key" — does NOT echo the key', async () => {
      const boxes = await HmacBoxSource.generateBoxes(MESSAGE, { hmac: KEY });
      expect(optionsOf(boxes)['Key Length']).toBe('3');
      expect(boxes[0].props.plaintextOutput).not.toContain(`${KEY}:`);
      expect(Object.values(optionsOf(boxes))).not.toContain(KEY);
    });

    it('reports correct byte length for a multi-byte UTF-8 key', async () => {
      // '€' is 3 UTF-8 bytes
      const boxes = await HmacBoxSource.generateBoxes(MESSAGE, { hmac: '€' });
      expect(optionsOf(boxes)['Key Length']).toBe('3');
    });
  });

  describe('generateBoxes — output shape', () => {
    it('returns a single HMAC box using KeyValueBoxTemplate', async () => {
      const boxes = await HmacBoxSource.generateBoxes(MESSAGE, { hmac: KEY });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('HMAC');
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
      expect(boxes[0].props.showExpandButton).toBe(false);
    });

    it('plaintextOutput is k:v lines matching options', async () => {
      const boxes = await HmacBoxSource.generateBoxes(MESSAGE, { hmac: KEY });
      const text = boxes[0].props.plaintextOutput;
      expect(text).toBe(
        [
          `HMAC-SHA256: ${EXPECTED_SHA256}`,
          `HMAC-SHA1: ${EXPECTED_SHA1}`,
          `HMAC-SHA512: ${EXPECTED_SHA512}`,
          'Key Length: 3',
        ].join('\n'),
      );
    });

    it('priority is set on the box', async () => {
      const boxes = await HmacBoxSource.generateBoxes(MESSAGE, { hmac: KEY });
      expect(boxes[0].props.priority).toBe(10);
    });
  });

  describe('generateBoxes — empty input', () => {
    it('still returns an HMAC box (HMAC of empty message is valid)', async () => {
      const boxes = await HmacBoxSource.generateBoxes('', { hmac: KEY });
      expect(boxes).toHaveLength(1);
      expect(optionsOf(boxes)['HMAC-SHA256']).toBe(EXPECTED_SHA256_EMPTY);
    });
  });

  describe('generateBoxes — oversized input', () => {
    it('returns empty array when input exceeds 100k chars', async () => {
      const boxes = await HmacBoxSource.generateBoxes('a'.repeat(100_001), {
        hmac: KEY,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes — non-secure context fallback', () => {
    const originalCrypto = globalThis.crypto;

    beforeEach(() => {
      Object.defineProperty(globalThis, 'crypto', {
        value: { subtle: undefined },
        configurable: true,
        writable: true,
      });
    });

    afterEach(() => {
      Object.defineProperty(globalThis, 'crypto', {
        value: originalCrypto,
        configurable: true,
        writable: true,
      });
    });

    it('returns an informational box when crypto.subtle is unavailable', async () => {
      const boxes = await HmacBoxSource.generateBoxes(MESSAGE, { hmac: KEY });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/secure context/i);
      expect(boxes[0].boxTemplate).toBeUndefined();
    });
  });
});
