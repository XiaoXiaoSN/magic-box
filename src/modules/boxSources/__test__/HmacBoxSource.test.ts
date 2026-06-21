import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { HmacBoxSource } from '../HmacBoxSource';

// RFC 4231 / well-known HMAC test vectors
// key = 'key', message = 'The quick brown fox jumps over the lazy dog'
const FOX_MSG = 'The quick brown fox jumps over the lazy dog';
const FOX_KEY = 'key';
const FOX_SHA256 =
  'f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8';
const FOX_SHA1 = 'de7c9b85b8b78aa6bc8a7a36f70a90701c9db4d9';

describe('HmacBoxSource', () => {
  describe('no trigger option', () => {
    it('returns empty array when hmac option is absent', async () => {
      const boxes = await HmacBoxSource.generateBoxes('msg', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty options object', async () => {
      const boxes = await HmacBoxSource.generateBoxes('msg', {});
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array when unrelated options are present', async () => {
      const boxes = await HmacBoxSource.generateBoxes('msg', { sha256: true });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('key validation', () => {
    it('returns a key-required box when ::hmac has no value (boolean true)', async () => {
      const boxes = await HmacBoxSource.generateBoxes('msg', { hmac: true });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/key.*required/i);
    });

    it('returns a key-required box when key is an empty string', async () => {
      const boxes = await HmacBoxSource.generateBoxes('msg', { hmac: '' });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/key.*required/i);
    });
  });

  describe('RFC 4231 / known vectors — SHA-256 default', () => {
    it('produces correct HMAC-SHA256 for the fox message (default algorithm)', async () => {
      const boxes = await HmacBoxSource.generateBoxes(FOX_MSG, {
        hmac: FOX_KEY,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.Hex).toBe(FOX_SHA256);
      expect(boxes[0].props.options?.Algorithm).toBe('HMAC-SHA256');
    });

    it('produces correct HMAC-SHA256 when explicitly selected via ::hmacalg=sha256', async () => {
      const boxes = await HmacBoxSource.generateBoxes(FOX_MSG, {
        hmac: FOX_KEY,
        hmacalg: 'sha256',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.Hex).toBe(FOX_SHA256);
    });
  });

  describe('RFC 4231 / known vectors — SHA-1', () => {
    it('produces correct HMAC-SHA1 for the fox message', async () => {
      const boxes = await HmacBoxSource.generateBoxes(FOX_MSG, {
        hmac: FOX_KEY,
        hmacalg: 'sha1',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.Hex).toBe(FOX_SHA1);
      expect(boxes[0].props.options?.Algorithm).toBe('HMAC-SHA1');
    });
  });

  describe('algorithm selection', () => {
    it('falls back to SHA-256 for an unrecognised algorithm alias', async () => {
      const boxes = await HmacBoxSource.generateBoxes('msg', {
        hmac: 'secret',
        hmacalg: 'md5',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.Algorithm).toBe('HMAC-SHA256');
    });

    it('selects SHA-512 when ::hmacalg=sha512', async () => {
      const boxes = await HmacBoxSource.generateBoxes('msg', {
        hmac: 'secret',
        hmacalg: 'sha512',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.Algorithm).toBe('HMAC-SHA512');
      // SHA-512 HMAC produces 128-char hex
      expect(boxes[0].props.options?.Hex).toHaveLength(128);
    });
  });

  describe('security — key not exposed in output', () => {
    it('does not include the key value in any option', async () => {
      const boxes = await HmacBoxSource.generateBoxes(FOX_MSG, {
        hmac: FOX_KEY,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options ?? {};
      for (const v of Object.values(opts)) {
        expect(v).not.toBe(FOX_KEY);
      }
    });

    it('only exposes Algorithm and Hex keys in options', async () => {
      const boxes = await HmacBoxSource.generateBoxes('msg', {
        hmac: 'topsecret',
      });
      expect(boxes).toHaveLength(1);
      const keys = Object.keys(boxes[0].props.options ?? {});
      expect(keys).toEqual(['Algorithm', 'Hex']);
    });
  });

  describe('box shape', () => {
    it('uses KeyValueBoxTemplate', async () => {
      const boxes = await HmacBoxSource.generateBoxes('msg', { hmac: 'k' });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
    });

    it('sets priority to the source priority', async () => {
      const boxes = await HmacBoxSource.generateBoxes('msg', { hmac: 'k' });
      expect(boxes[0].props.priority).toBe(HmacBoxSource.priority);
    });
  });

  describe('input cap', () => {
    it('returns empty array when input exceeds MAX_INPUT', async () => {
      const large = 'x'.repeat(100_001);
      const boxes = await HmacBoxSource.generateBoxes(large, { hmac: 'k' });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('non-secure context fallback', () => {
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

    it('returns a single informational box mentioning secure context', async () => {
      const boxes = await HmacBoxSource.generateBoxes('msg', { hmac: 'k' });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/secure context/i);
    });
  });

  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(HmacBoxSource.name).toBe('HMAC');
      expect(HmacBoxSource.tag).toBe('#');
      expect(HmacBoxSource.kind).toBe('Encode');
      expect(typeof HmacBoxSource.priority).toBe('number');
    });
  });
});
