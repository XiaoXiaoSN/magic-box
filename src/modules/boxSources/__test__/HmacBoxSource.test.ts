import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { HmacBoxSource } from '../HmacBoxSource';

describe('HmacBoxSource', () => {
  describe('generateBoxes - no option', () => {
    it('returns empty array when hmac option is absent', async () => {
      const boxes = await HmacBoxSource.generateBoxes('hello', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty options object', async () => {
      const boxes = await HmacBoxSource.generateBoxes('hello', {});
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes - SHA-256 RFC vector', () => {
    it('produces correct HMAC-SHA256 for the RFC 4231 / FIPS vector', async () => {
      // vector: key="key", message="The quick brown fox jumps over the lazy dog"
      // expected: f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8
      const boxes = await HmacBoxSource.generateBoxes(
        'The quick brown fox jumps over the lazy dog',
        { hmac: 'key' },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe(
        'f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8',
      );
    });

    it('box name contains SHA256 for the default algorithm', async () => {
      const boxes = await HmacBoxSource.generateBoxes('msg', {
        hmac: 'secret',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toMatch(/SHA256/i);
    });
  });

  describe('generateBoxes - key required', () => {
    it('returns a box mentioning key when ::hmac has no value (bare flag)', async () => {
      // bare ::hmac parsed as { hmac: true }
      const boxes = await HmacBoxSource.generateBoxes('msg', { hmac: true });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/key/i);
    });
  });

  describe('generateBoxes - algorithm selection', () => {
    it('uses SHA-1 when ::sha1 option is set', async () => {
      const boxes = await HmacBoxSource.generateBoxes('msg', {
        hmac: 'secret',
        sha1: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toMatch(/SHA1/i);
    });

    it('uses SHA-512 when ::sha512 option is set', async () => {
      const boxes = await HmacBoxSource.generateBoxes('msg', {
        hmac: 'secret',
        sha512: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toMatch(/SHA512/i);
    });
  });

  describe('generateBoxes - non-secure context fallback', () => {
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
      const boxes = await HmacBoxSource.generateBoxes('msg', { hmac: 'key' });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/secure context/i);
    });
  });

  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(HmacBoxSource.name).toBe('HMAC');
      expect(HmacBoxSource.tag).toBe('#');
      expect(HmacBoxSource.kind).toBe('Hash');
      expect(typeof HmacBoxSource.priority).toBe('number');
    });
  });
});
