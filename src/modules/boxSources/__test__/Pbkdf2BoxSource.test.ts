import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Pbkdf2BoxSource } from '../Pbkdf2BoxSource';

// PBKDF2(password="password", salt="salt") known-answer vectors. SHA-1 ones
// are RFC 6070; the SHA-256 / SHA-512 ones are the widely published
// equivalents. all verified against node:crypto pbkdf2Sync.
const SHA1_C1_20 = '0c60c80f961f0e71f3a9b524af6012062fe037a6';
const SHA1_C2_20 = 'ea6c014dc72d6f8ccd1ed92ace1d41f0d8de8957';
const SHA256_C1_32 =
  '120fb6cffcf8b32c43e7225256c4f837a86548c92ccc35480805987cb70be17b';
const SHA256_C2_32 =
  'ae4d0c95af6b46d32d0adff928f06dd02a303f8ef3c251dfd6e2d85a95474c43';
const SHA512_C1_64 =
  '867f70cf1ade02cff3752599a3a53dc4af34c7a669815ae5d513554e1c8cf252c02d470a285a0501bad999bfe943c08f050235d7d68b1da55e63f73b60a57fce';
// PBKDF2-HMAC-SHA256(password="", salt="salt", c=1, dklen=32)
const SHA256_EMPTY_PW =
  'f135c27993baf98773c5cdb40a5706ce6a345cde61b000a67858650cd6a324d7';

type Boxes = Awaited<ReturnType<typeof Pbkdf2BoxSource.generateBoxes>>;
const optionsOf = (boxes: Boxes, i = 0) =>
  (boxes[i].props.options ?? {}) as Record<string, string>;

describe('Pbkdf2BoxSource', () => {
  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(Pbkdf2BoxSource.name).toBe('PBKDF2');
      expect(Pbkdf2BoxSource.tag).toBe('#');
      expect(Pbkdf2BoxSource.kind).toBe('Encode');
      expect(Pbkdf2BoxSource.priority).toBe(10);
      expect(Pbkdf2BoxSource.defaultDisabled).toBe(true);
      // password is the primary input, salt rides on the option
      expect(Pbkdf2BoxSource.defaultInput).toBe('password ::pbkdf2=salt');
    });
  });

  describe('generateBoxes - no option', () => {
    it('returns empty array when no option is provided', async () => {
      const boxes = await Pbkdf2BoxSource.generateBoxes('password', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty options object', async () => {
      const boxes = await Pbkdf2BoxSource.generateBoxes('password', {});
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array when only PRF selectors are given', async () => {
      const boxes = await Pbkdf2BoxSource.generateBoxes('password', {
        sha256: true,
        prf: 'sha1',
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes - bare ::pbkdf2 (no salt value)', () => {
    it('returns a usage hint box when ::pbkdf2 is boolean true', async () => {
      const boxes = await Pbkdf2BoxSource.generateBoxes('password', {
        pbkdf2: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('PBKDF2');
      expect(boxes[0].props.plaintextOutput).toMatch(/provide a salt/i);
      // errorBox leaves the template undefined so the web layer falls back
      // to DefaultBoxTemplate and the headless layer prints the message
      expect(boxes[0].boxTemplate).toBeUndefined();
      expect(boxes[0].props.showExpandButton).toBe(false);
    });
  });

  describe('generateBoxes - PBKDF2-HMAC-SHA256 (default PRF) known vectors', () => {
    it('derives correct key for password=password, salt=salt, c=1, dklen=32', async () => {
      const boxes = await Pbkdf2BoxSource.generateBoxes('password', {
        pbkdf2: 'salt',
        iterations: '1',
      });

      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('PBKDF2');
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);

      const opts = optionsOf(boxes);
      expect(opts['Derived Key (hex)']).toBe(SHA256_C1_32);
      expect(opts.Salt).toBe('salt');
      expect(opts.Iterations).toBe('1');
      expect(opts['Key Length (bytes)']).toBe('32');
      expect(opts.PRF).toBe('HMAC-SHA256');
    });

    it('derives correct key for c=2', async () => {
      const boxes = await Pbkdf2BoxSource.generateBoxes('password', {
        pbkdf2: 'salt',
        iterations: '2',
      });
      expect(optionsOf(boxes)['Derived Key (hex)']).toBe(SHA256_C2_32);
    });

    it('custom dklen=16 returns first 16 bytes of the c=1 vector', async () => {
      const boxes = await Pbkdf2BoxSource.generateBoxes('password', {
        pbkdf2: 'salt',
        iterations: '1',
        dklen: '16',
      });
      const opts = optionsOf(boxes);
      expect(opts['Derived Key (hex)']).toBe(SHA256_C1_32.slice(0, 32));
      expect(opts['Key Length (bytes)']).toBe('16');
    });

    it('salt with spaces is used verbatim', async () => {
      const boxes = await Pbkdf2BoxSource.generateBoxes('password', {
        pbkdf2: 'my salt',
        iterations: '1',
      });
      expect(optionsOf(boxes).Salt).toBe('my salt');
      expect(optionsOf(boxes)['Derived Key (hex)']).not.toBe(SHA256_C1_32);
    });

    it('empty password still derives (PBKDF2 of "" is defined)', async () => {
      const boxes = await Pbkdf2BoxSource.generateBoxes('', {
        pbkdf2: 'salt',
        iterations: '1',
      });
      expect(boxes).toHaveLength(1);
      expect(optionsOf(boxes)['Derived Key (hex)']).toBe(SHA256_EMPTY_PW);
    });
  });

  describe('generateBoxes - PRF selection', () => {
    it('::prf=sha1 uses HMAC-SHA1 (RFC 6070 c=1 and c=2)', async () => {
      const c1 = await Pbkdf2BoxSource.generateBoxes('password', {
        pbkdf2: 'salt',
        prf: 'sha1',
        iterations: '1',
        dklen: '20',
      });
      expect(c1).toHaveLength(1);
      expect(optionsOf(c1)['Derived Key (hex)']).toBe(SHA1_C1_20);
      expect(optionsOf(c1).PRF).toBe('HMAC-SHA1');

      const c2 = await Pbkdf2BoxSource.generateBoxes('password', {
        pbkdf2: 'salt',
        prf: 'sha1',
        iterations: '2',
        dklen: '20',
      });
      expect(optionsOf(c2)['Derived Key (hex)']).toBe(SHA1_C2_20);
    });

    it('::prf=sha512 uses HMAC-SHA512', async () => {
      const boxes = await Pbkdf2BoxSource.generateBoxes('password', {
        pbkdf2: 'salt',
        prf: 'sha512',
        iterations: '1',
        dklen: '64',
      });
      expect(optionsOf(boxes)['Derived Key (hex)']).toBe(SHA512_C1_64);
      expect(optionsOf(boxes).PRF).toBe('HMAC-SHA512');
    });

    it('::prf accepts HMAC-SHA512 / SHA-512 spellings case-insensitively', async () => {
      for (const prf of ['HMAC-SHA512', 'SHA-512', 'hmac_sha512', 'Sha512']) {
        const boxes = await Pbkdf2BoxSource.generateBoxes('password', {
          pbkdf2: 'salt',
          prf,
          iterations: '1',
          dklen: '64',
        });
        expect(optionsOf(boxes)['Derived Key (hex)']).toBe(SHA512_C1_64);
      }
    });

    it('bare ::sha1 selects HMAC-SHA1', async () => {
      const boxes = await Pbkdf2BoxSource.generateBoxes('password', {
        pbkdf2: 'salt',
        sha1: true,
        iterations: '1',
        dklen: '20',
      });
      expect(boxes).toHaveLength(1);
      expect(optionsOf(boxes)['Derived Key (hex)']).toBe(SHA1_C1_20);
      expect(optionsOf(boxes).PRF).toBe('HMAC-SHA1');
    });

    it('several bare selectors yield one box per PRF in canonical order', async () => {
      const boxes = await Pbkdf2BoxSource.generateBoxes('password', {
        pbkdf2: 'salt',
        sha512: true,
        sha1: true,
        sha256: true,
        iterations: '1',
        dklen: '20',
      });
      expect(boxes).toHaveLength(3);
      expect(boxes.map((b) => b.props.name)).toEqual([
        'PBKDF2',
        'PBKDF2',
        'PBKDF2',
      ]);
      expect(boxes.map((_, i) => optionsOf(boxes, i).PRF)).toEqual([
        'HMAC-SHA256',
        'HMAC-SHA1',
        'HMAC-SHA512',
      ]);
      expect(optionsOf(boxes, 0)['Derived Key (hex)']).toBe(
        SHA256_C1_32.slice(0, 40),
      );
      expect(optionsOf(boxes, 1)['Derived Key (hex)']).toBe(SHA1_C1_20);
      expect(optionsOf(boxes, 2)['Derived Key (hex)']).toBe(
        SHA512_C1_64.slice(0, 40),
      );
    });

    it('::prf=<name> wins over bare selectors', async () => {
      const boxes = await Pbkdf2BoxSource.generateBoxes('password', {
        pbkdf2: 'salt',
        prf: 'sha1',
        sha512: true,
        iterations: '1',
        dklen: '20',
      });
      expect(boxes).toHaveLength(1);
      expect(optionsOf(boxes).PRF).toBe('HMAC-SHA1');
    });

    it('unknown ::prf value returns an error box', async () => {
      const boxes = await Pbkdf2BoxSource.generateBoxes('password', {
        pbkdf2: 'salt',
        prf: 'md5',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/unknown PRF/i);
      expect(boxes[0].boxTemplate).toBeUndefined();
    });
  });

  describe('generateBoxes - iterations / dklen handling', () => {
    it('uses default iterations=100000 and dklen=32 when not specified', async () => {
      const boxes = await Pbkdf2BoxSource.generateBoxes('password', {
        pbkdf2: 'salt',
      });
      const opts = optionsOf(boxes);
      expect(opts.Iterations).toBe('100000');
      expect(opts['Key Length (bytes)']).toBe('32');
      expect(opts['Derived Key (hex)']).toHaveLength(64);
    });

    it('falls back to defaults for non-numeric values', async () => {
      const boxes = await Pbkdf2BoxSource.generateBoxes('password', {
        pbkdf2: 'salt',
        iterations: 'lots',
        dklen: 'big',
      });
      const opts = optionsOf(boxes);
      expect(opts.Iterations).toBe('100000');
      expect(opts['Key Length (bytes)']).toBe('32');
    });

    it('clamps iterations to [1, 1000000] and dklen to [1, 256]', async () => {
      const low = await Pbkdf2BoxSource.generateBoxes('password', {
        pbkdf2: 'salt',
        iterations: '0',
        dklen: '0',
      });
      expect(optionsOf(low).Iterations).toBe('1');
      expect(optionsOf(low)['Key Length (bytes)']).toBe('1');
      expect(optionsOf(low)['Derived Key (hex)']).toHaveLength(2);

      const high = await Pbkdf2BoxSource.generateBoxes('password', {
        pbkdf2: 'salt',
        iterations: '1',
        dklen: '9999',
      });
      expect(optionsOf(high)['Key Length (bytes)']).toBe('256');
      expect(optionsOf(high)['Derived Key (hex)']).toHaveLength(512);
    });
  });

  describe('generateBoxes - password redaction', () => {
    it('does not echo the password anywhere in the output', async () => {
      const boxes = await Pbkdf2BoxSource.generateBoxes('hunter2', {
        pbkdf2: 'salt',
        iterations: '1',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).not.toContain('hunter2');
      expect(Object.values(optionsOf(boxes))).not.toContain('hunter2');
      expect(Object.keys(optionsOf(boxes))).toEqual([
        'Derived Key (hex)',
        'Salt',
        'Iterations',
        'Key Length (bytes)',
        'PRF',
      ]);
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
      const boxes = await Pbkdf2BoxSource.generateBoxes('password', {
        pbkdf2: 'salt',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/secure context/i);
      expect(boxes[0].boxTemplate).toBeUndefined();
    });
  });
});
