import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { Base32BoxSource } from '../Base32BoxSource';

describe('Base32BoxSource', () => {
  describe('option gating', () => {
    it('returns empty array when no option is provided', async () => {
      const boxes = await Base32BoxSource.generateBoxes('foobar', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty options object', async () => {
      const boxes = await Base32BoxSource.generateBoxes('foobar', {});
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty input with encode option', async () => {
      const boxes = await Base32BoxSource.generateBoxes('', { base32: true });
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for whitespace-only input', async () => {
      const boxes = await Base32BoxSource.generateBoxes('   ', {
        base32: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('RFC 4648 encode vectors', () => {
    it('encodes "foobar" to MZXW6YTBOI======', async () => {
      const boxes = await Base32BoxSource.generateBoxes('foobar', {
        base32: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('MZXW6YTBOI======');
      expect(boxes[0].props.name).toBe('Base32 (Encode)');
    });

    it('encodes "f" to MY======', async () => {
      const boxes = await Base32BoxSource.generateBoxes('f', { base32: true });
      expect(boxes[0].props.plaintextOutput).toBe('MY======');
    });

    it('encodes "fo" to MZXQ====', async () => {
      const boxes = await Base32BoxSource.generateBoxes('fo', { base32: true });
      expect(boxes[0].props.plaintextOutput).toBe('MZXQ====');
    });

    it('encodes "foo" to MZXW6===', async () => {
      const boxes = await Base32BoxSource.generateBoxes('foo', {
        base32: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('MZXW6===');
    });

    it('also encodes via ::base32encode option', async () => {
      const boxes = await Base32BoxSource.generateBoxes('foobar', {
        base32encode: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('MZXW6YTBOI======');
    });
  });

  describe('RFC 4648 decode vectors', () => {
    it('decodes MZXW6YTBOI====== to "foobar"', async () => {
      const boxes = await Base32BoxSource.generateBoxes('MZXW6YTBOI======', {
        base32decode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('foobar');
      expect(boxes[0].props.name).toBe('Base32 (Decode)');
    });
  });

  describe('round-trip', () => {
    it('round-trips "hello world"', async () => {
      const encodeBoxes = await Base32BoxSource.generateBoxes('hello world', {
        base32: true,
      });
      expect(encodeBoxes).toHaveLength(1);
      const encoded = encodeBoxes[0].props.plaintextOutput;

      const decodeBoxes = await Base32BoxSource.generateBoxes(encoded, {
        base32decode: true,
      });
      expect(decodeBoxes).toHaveLength(1);
      expect(decodeBoxes[0].props.plaintextOutput).toBe('hello world');
    });
  });

  describe('invalid decode', () => {
    it('returns an error box for invalid Base32 input "!!!"', async () => {
      const boxes = await Base32BoxSource.generateBoxes('!!!', {
        base32decode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/invalid/i);
      expect(boxes[0].props.name).toBe('Base32 (Decode)');
    });
  });

  describe('both options produce 2 boxes', () => {
    it('returns encode and decode boxes when both options are set', async () => {
      const encoded = 'MZXW6YTBOI======';
      const boxes = await Base32BoxSource.generateBoxes(encoded, {
        base32: true,
        base32decode: true,
      });
      expect(boxes).toHaveLength(2);
      expect(boxes[0].props.name).toBe('Base32 (Encode)');
      expect(boxes[1].props.name).toBe('Base32 (Decode)');
    });
  });

  describe('box properties', () => {
    it('uses DefaultBoxTemplate for encode box', async () => {
      const boxes = await Base32BoxSource.generateBoxes('hello', {
        base32: true,
      });
      expect(boxes[0].boxTemplate).toBe(DefaultBoxTemplate);
    });

    it('sets showExpandButton to false', async () => {
      const boxes = await Base32BoxSource.generateBoxes('hello', {
        base32: true,
      });
      expect(boxes[0].props.showExpandButton).toBe(false);
    });
  });

  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(Base32BoxSource.name).toBe('Base32');
      expect(Base32BoxSource.tag).toBe('#');
      expect(Base32BoxSource.kind).toBe('Encode');
      expect(typeof Base32BoxSource.priority).toBe('number');
    });

    it('decodes input with trailing whitespace after the padding', async () => {
      // common copy-paste shape: a newline after the padded value
      const boxes = await Base32BoxSource.generateBoxes('MY======\n', {
        base32decode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('f');
    });
  });
});
