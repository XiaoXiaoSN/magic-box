import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { Base32BoxSource } from '@modules/boxSources/Base32BoxSource';
import { describe, expect, it } from 'vitest';

describe('Base32BoxSource', () => {
  describe('generateBoxes - no option', () => {
    it('returns empty array when no option is provided', async () => {
      const boxes = await Base32BoxSource.generateBoxes('hello', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty options object', async () => {
      const boxes = await Base32BoxSource.generateBoxes('hello', {});
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes - encode (::base32)', () => {
    it('encodes "foobar" per RFC 4648 test vector', async () => {
      const boxes = await Base32BoxSource.generateBoxes('foobar', {
        base32: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Base32 (Encode)');
      expect(boxes[0].props.plaintextOutput).toBe('MZXW6YTBOI======');
      expect(boxes[0].boxTemplate).toBe(DefaultBoxTemplate);
      expect(boxes[0].props.showExpandButton).toBe(false);
    });

    it('encodes "foo" per RFC 4648 test vector', async () => {
      const boxes = await Base32BoxSource.generateBoxes('foo', {
        base32: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('MZXW6===');
    });

    it('encodes "f" per RFC 4648 test vector', async () => {
      const boxes = await Base32BoxSource.generateBoxes('f', { base32: true });
      expect(boxes[0].props.plaintextOutput).toBe('MY======');
    });

    it('encodes empty string to empty string', async () => {
      const boxes = await Base32BoxSource.generateBoxes('', { base32: true });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('');
    });

    it('also triggers on ::base32encode option key', async () => {
      const boxes = await Base32BoxSource.generateBoxes('foobar', {
        base32encode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('MZXW6YTBOI======');
    });
  });

  describe('generateBoxes - decode (::base32decode)', () => {
    it('decodes "MZXW6YTBOI======" back to "foobar"', async () => {
      const boxes = await Base32BoxSource.generateBoxes('MZXW6YTBOI======', {
        base32decode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Base32 (Decode)');
      expect(boxes[0].props.plaintextOutput).toBe('foobar');
    });

    it('decodes lowercase input (case-insensitive)', async () => {
      const boxes = await Base32BoxSource.generateBoxes('mzxw6ytboi======', {
        base32decode: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('foobar');
    });

    it('decodes "MZXW6===" back to "foo"', async () => {
      const boxes = await Base32BoxSource.generateBoxes('MZXW6===', {
        base32decode: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('foo');
    });

    it('decodes without padding ("MZXW6" → "foo")', async () => {
      // RFC 4648 §3.3: decoders should handle missing padding
      const boxes = await Base32BoxSource.generateBoxes('MZXW6', {
        base32decode: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('foo');
    });

    it('decodes lowercase without padding ("mzxw6" → "foo")', async () => {
      const boxes = await Base32BoxSource.generateBoxes('mzxw6', {
        base32decode: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('foo');
    });
  });

  describe('generateBoxes - invalid decode input', () => {
    it('returns an error box for input containing non-alphabet chars', async () => {
      const boxes = await Base32BoxSource.generateBoxes('0189', {
        base32decode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Base32 (Decode)');
      expect(boxes[0].props.plaintextOutput).toMatch(/invalid/i);
    });

    it('returns an error box for input with digits 0, 1, 8, 9', async () => {
      const boxes = await Base32BoxSource.generateBoxes('HELLO0', {
        base32decode: true,
      });
      expect(boxes[0].props.plaintextOutput).toMatch(/invalid/i);
    });

    it('rejects non-zero padding bits per RFC 4648 §6 (AR====== )', async () => {
      // 'AQ======' is the canonical encoding of byte 0x04; 'AR======' carries
      // the same bytes but with dirty padding bits and must not decode
      const boxes = await Base32BoxSource.generateBoxes('AR======', {
        base32decode: true,
      });
      expect(boxes[0].props.plaintextOutput).toMatch(/invalid/i);
    });
  });

  describe('generateBoxes - encode and decode together', () => {
    it('returns two boxes when both encode and decode options are set', async () => {
      const boxes = await Base32BoxSource.generateBoxes('foobar', {
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
      expect(Base32BoxSource.tag).toBe('#');
      expect(Base32BoxSource.kind).toBe('Encode');
      expect(typeof Base32BoxSource.priority).toBe('number');
    });
  });
});
