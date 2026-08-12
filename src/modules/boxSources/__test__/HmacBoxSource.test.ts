import {
  DefaultBoxTemplate,
  KeyValueBoxTemplate,
} from '@components/BoxTemplate';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { HmacBoxSource } from '../HmacBoxSource';

// canonical test message and key used across most test cases
const MESSAGE = 'The quick brown fox jumps over the lazy dog';
const KEY = 'key';

// RFC 4231 / Wikipedia HMAC known vectors for message=MESSAGE, key=KEY
const EXPECTED_SHA256 =
  'f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8';
const EXPECTED_SHA1 = 'de7c9b85b8b78aa6bc8a7a36f70a90701c9db4d9';

describe('HmacBoxSource', () => {
  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(HmacBoxSource.name).toBe('HMAC');
      expect(HmacBoxSource.tag).toBe('#');
      expect(HmacBoxSource.kind).toBe('Encode');
      expect(HmacBoxSource.priority).toBe(10);
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
        sha256: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes — bare ::hmac (boolean true) → usage box', () => {
    it('returns a usage hint box when key value is boolean true', async () => {
      const boxes = await HmacBoxSource.generateBoxes(MESSAGE, { hmac: true });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('HMAC');
      expect(boxes[0].props.plaintextOutput).toMatch(/provide a key/i);
      expect(boxes[0].boxTemplate).toBe(DefaultBoxTemplate);
    });
  });

  describe('generateBoxes — HMAC-SHA256 known vector', () => {
    it('produces the canonical HMAC-SHA256 digest (Wikipedia / RFC 4231)', async () => {
      const boxes = await HmacBoxSource.generateBoxes(MESSAGE, { hmac: KEY });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.['HMAC-SHA256']).toBe(EXPECTED_SHA256);
    });

    it('also accepts the ::hmacsha256 alias', async () => {
      const boxes = await HmacBoxSource.generateBoxes(MESSAGE, {
        hmacsha256: KEY,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.['HMAC-SHA256']).toBe(EXPECTED_SHA256);
    });
  });

  describe('generateBoxes — HMAC-SHA1 known vector', () => {
    it('produces the canonical HMAC-SHA1 digest (Wikipedia)', async () => {
      const boxes = await HmacBoxSource.generateBoxes(MESSAGE, { hmac: KEY });
      expect(boxes[0].props.options?.['HMAC-SHA1']).toBe(EXPECTED_SHA1);
    });
  });

  describe('generateBoxes — Key Length field', () => {
    it('reports key byte length as "3" for key "key" — does NOT echo the key', async () => {
      const boxes = await HmacBoxSource.generateBoxes(MESSAGE, { hmac: KEY });
      expect(boxes[0].props.options?.['Key Length']).toBe('3');
      // confirm the raw key string is absent from plaintext output
      expect(boxes[0].props.plaintextOutput).not.toContain(`${KEY}:`);
    });

    it('reports correct byte length for a multi-byte UTF-8 key', async () => {
      // '€' is 3 UTF-8 bytes
      const boxes = await HmacBoxSource.generateBoxes(MESSAGE, { hmac: '€' });
      expect(boxes[0].props.options?.['Key Length']).toBe('3');
    });
  });

  describe('generateBoxes — output shape', () => {
    it('returns a single HMAC box using KeyValueBoxTemplate', async () => {
      const boxes = await HmacBoxSource.generateBoxes(MESSAGE, { hmac: KEY });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('HMAC');
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
    });

    it('options record contains all four expected keys', async () => {
      const boxes = await HmacBoxSource.generateBoxes(MESSAGE, { hmac: KEY });
      const opts = boxes[0].props.options ?? {};
      expect(Object.keys(opts)).toEqual([
        'HMAC-SHA256',
        'HMAC-SHA1',
        'HMAC-SHA512',
        'Key Length',
      ]);
    });

    it('plaintextOutput is non-empty k:v lines', async () => {
      const boxes = await HmacBoxSource.generateBoxes(MESSAGE, { hmac: KEY });
      const text = boxes[0].props.plaintextOutput;
      expect(text).toContain('HMAC-SHA256:');
      expect(text).toContain('HMAC-SHA1:');
      expect(text).toContain('HMAC-SHA512:');
      expect(text).toContain('Key Length:');
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
      // HMAC-SHA256('', 'key') is a fixed deterministic value — just assert it is 64 hex chars
      const sha256 = boxes[0].props.options?.['HMAC-SHA256'] as string;
      expect(sha256).toHaveLength(64);
      expect(sha256).toMatch(/^[0-9a-f]{64}$/);
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
      expect(boxes[0].boxTemplate).toBe(DefaultBoxTemplate);
    });
  });
});
