import {
  DefaultBoxTemplate,
  KeyValueBoxTemplate,
} from '@components/BoxTemplate';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Pbkdf2BoxSource } from '../Pbkdf2BoxSource';

describe('Pbkdf2BoxSource', () => {
  describe('generateBoxes - no option', () => {
    it('returns empty array when no option is provided', async () => {
      const boxes = await Pbkdf2BoxSource.generateBoxes('salt', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty options object', async () => {
      const boxes = await Pbkdf2BoxSource.generateBoxes('salt', {});
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes - bare ::pbkdf2 (no password value)', () => {
    it('returns a usage hint box when ::pbkdf2 is boolean true', async () => {
      const boxes = await Pbkdf2BoxSource.generateBoxes('salt', {
        pbkdf2: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/provide a password/i);
      expect(boxes[0].boxTemplate).toBe(DefaultBoxTemplate);
    });
  });

  describe('generateBoxes - PBKDF2-HMAC-SHA256 known vectors', () => {
    // RFC 6070 test vectors translated to SHA-256 (SHA-256 canonical vectors)
    it('derives correct key for password=password, salt=salt, c=1, dklen=32', async () => {
      const boxes = await Pbkdf2BoxSource.generateBoxes('salt', {
        pbkdf2: 'password',
        iterations: '1',
      });

      expect(boxes).toHaveLength(1);
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Derived Key (hex)']).toBe(
        '120fb6cffcf8b32c43e7225256c4f837a86548c92ccc35480805987cb70be17b',
      );
      expect(opts.Salt).toBe('salt');
      expect(opts.Iterations).toBe('1');
      expect(opts['Key Length (bytes)']).toBe('32');
      expect(opts.Hash).toBe('SHA-256');
    });

    it('derives correct key for password=password, salt=salt, c=2, dklen=32', async () => {
      const boxes = await Pbkdf2BoxSource.generateBoxes('salt', {
        pbkdf2: 'password',
        iterations: '2',
      });

      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Derived Key (hex)']).toBe(
        'ae4d0c95af6b46d32d0adff928f06dd02a303f8ef3c251dfd6e2d85a95474c43',
      );
    });

    it('custom dklen=16 returns first 16 bytes of c=1 vector', async () => {
      const boxes = await Pbkdf2BoxSource.generateBoxes('salt', {
        pbkdf2: 'password',
        iterations: '1',
        dklen: '16',
      });

      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      // first 32 hex chars = 16 bytes
      expect(opts['Derived Key (hex)']).toBe(
        '120fb6cffcf8b32c43e7225256c4f837',
      );
      expect(opts['Key Length (bytes)']).toBe('16');
    });
  });

  describe('generateBoxes - password redaction', () => {
    it('does not echo the password in plaintextOutput', async () => {
      const boxes = await Pbkdf2BoxSource.generateBoxes('salt', {
        pbkdf2: 'password',
        iterations: '1',
      });

      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).not.toContain('password');
    });

    it('does not include the password in options', async () => {
      const boxes = await Pbkdf2BoxSource.generateBoxes('salt', {
        pbkdf2: 'password',
        iterations: '1',
      });

      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      // none of the option values should be the literal password string
      const values = Object.values(opts);
      expect(values).not.toContain('password');
      // the option key 'pbkdf2' must not be present in output options
      expect(Object.keys(opts)).not.toContain('pbkdf2');
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
      const boxes = await Pbkdf2BoxSource.generateBoxes('salt', {
        pbkdf2: 'password',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/secure context/i);
      expect(boxes[0].boxTemplate).toBe(DefaultBoxTemplate);
    });
  });

  describe('generateBoxes - default iterations and dklen', () => {
    it('uses default iterations=100000 and dklen=32 when not specified', async () => {
      const boxes = await Pbkdf2BoxSource.generateBoxes('salt', {
        pbkdf2: 'password',
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Iterations).toBe('100000');
      expect(opts['Key Length (bytes)']).toBe('32');
      // derived key should be 64 hex chars (32 bytes)
      expect(opts['Derived Key (hex)']).toHaveLength(64);
    });
  });

  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(Pbkdf2BoxSource.name).toBe('PBKDF2');
      expect(Pbkdf2BoxSource.tag).toBe('#');
      expect(Pbkdf2BoxSource.kind).toBe('Encode');
      expect(typeof Pbkdf2BoxSource.priority).toBe('number');
    });
  });
});
