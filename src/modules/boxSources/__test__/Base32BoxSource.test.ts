import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { Base32BoxSource } from '../Base32BoxSource';

describe('Base32BoxSource', () => {
  describe('option gating', () => {
    it('returns [] when no option is provided', async () => {
      const boxes = await Base32BoxSource.generateBoxes('foobar', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for empty options object', async () => {
      const boxes = await Base32BoxSource.generateBoxes('foobar', {});
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for empty input with encode option', async () => {
      const boxes = await Base32BoxSource.generateBoxes('', { base32: true });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for whitespace-only input', async () => {
      const boxes = await Base32BoxSource.generateBoxes('   ', {
        base32: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for input exceeding MAX_INPUT', async () => {
      const huge = 'a'.repeat(100_001);
      const boxes = await Base32BoxSource.generateBoxes(huge, { base32: true });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('encode — RFC 4648 §10 test vectors', () => {
    const cases: [string, string][] = [
      ['f', 'MY======'],
      ['fo', 'MZXQ===='],
      ['foo', 'MZXW6==='],
      ['foob', 'MZXW6YQ='],
      ['fooba', 'MZXW6YTB'],
      ['foobar', 'MZXW6YTBOI======'],
    ];

    for (const [plaintext, expected] of cases) {
      it(`encodes '${plaintext}' → '${expected}'`, async () => {
        const boxes = await Base32BoxSource.generateBoxes(plaintext, {
          base32: true,
        });
        expect(boxes).toHaveLength(1);
        expect(boxes[0].props.plaintextOutput).toBe(expected);
        expect(boxes[0].props.name).toBe('Base32 (Encode)');
        expect(boxes[0].boxTemplate).toBe(DefaultBoxTemplate);
        expect(boxes[0].props.showExpandButton).toBe(false);
      });
    }

    it('also triggers via ::base32encode option key', async () => {
      const boxes = await Base32BoxSource.generateBoxes('foobar', {
        base32encode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('MZXW6YTBOI======');
    });
  });

  describe('decode', () => {
    it("decodes 'MZXW6YTBOI======' → 'foobar'", async () => {
      const boxes = await Base32BoxSource.generateBoxes('MZXW6YTBOI======', {
        base32decode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('foobar');
      expect(boxes[0].props.name).toBe('Base32 (Decode)');
      expect(boxes[0].props.showExpandButton).toBe(false);
    });

    it('decodes each RFC 4648 vector back to the original plaintext', async () => {
      const cases: [string, string][] = [
        ['MY======', 'f'],
        ['MZXQ====', 'fo'],
        ['MZXW6===', 'foo'],
        ['MZXW6YQ=', 'foob'],
        ['MZXW6YTB', 'fooba'],
        ['MZXW6YTBOI======', 'foobar'],
      ];
      for (const [encoded, expected] of cases) {
        const boxes = await Base32BoxSource.generateBoxes(encoded, {
          base32decode: true,
        });
        expect(boxes[0].props.plaintextOutput).toBe(expected);
      }
    });

    it('returns an error box for invalid Base32 input (chars not in alphabet)', async () => {
      // '1', '8', '9', '0' are not in the RFC 4648 standard alphabet
      const boxes = await Base32BoxSource.generateBoxes('1890', {
        base32decode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/invalid Base32/i);
    });
  });

  describe('round-trip', () => {
    it('encodes then decodes Unicode back to the original string', async () => {
      const original = 'Hello, 世界! 😀';

      const encodeBoxes = await Base32BoxSource.generateBoxes(original, {
        base32: true,
      });
      expect(encodeBoxes).toHaveLength(1);
      const encoded = encodeBoxes[0].props.plaintextOutput;

      const decodeBoxes = await Base32BoxSource.generateBoxes(encoded, {
        base32decode: true,
      });
      expect(decodeBoxes).toHaveLength(1);
      expect(decodeBoxes[0].props.plaintextOutput).toBe(original);
    });
  });

  describe('both options simultaneously', () => {
    it('returns 2 boxes when both encode and decode options are set', async () => {
      // input is valid Base32 so decode succeeds; encode treats it as plaintext
      const boxes = await Base32BoxSource.generateBoxes('MZXW6YTBOI======', {
        base32: true,
        base32decode: true,
      });
      expect(boxes).toHaveLength(2);
      const names = boxes.map((b) => b.props.name);
      expect(names).toContain('Base32 (Encode)');
      expect(names).toContain('Base32 (Decode)');
    });
  });

  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(Base32BoxSource.name).toBe('Base32');
      expect(Base32BoxSource.kind).toBe('Encode');
      expect(typeof Base32BoxSource.priority).toBe('number');
    });
  });
});
