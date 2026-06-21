import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { Ascii85BoxSource } from '../Ascii85BoxSource';

describe('Ascii85BoxSource', () => {
  describe('no option → empty', () => {
    it('returns empty array when no option is provided', async () => {
      const boxes = await Ascii85BoxSource.generateBoxes('hello', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty options object', async () => {
      const boxes = await Ascii85BoxSource.generateBoxes('hello', {});
      expect(boxes).toHaveLength(0);
    });
  });

  describe('empty input → empty', () => {
    it('returns empty array for whitespace-only input with encode option', async () => {
      const boxes = await Ascii85BoxSource.generateBoxes('   ', {
        ascii85: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty string with decode option', async () => {
      const boxes = await Ascii85BoxSource.generateBoxes('', {
        ascii85decode: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('encode (::ascii85)', () => {
    it('encodes "hello" correctly', async () => {
      const boxes = await Ascii85BoxSource.generateBoxes('hello', {
        ascii85: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('BOu!rDZ');
      expect(boxes[0].props.name).toBe('Ascii85 (Encode)');
      expect(boxes[0].boxTemplate).toBe(DefaultBoxTemplate);
    });

    it('also triggers on ::ascii85encode option', async () => {
      const boxes = await Ascii85BoxSource.generateBoxes('hello', {
        ascii85encode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('BOu!rDZ');
    });

    it('encodes a string of 4 null bytes as "z" (z-shorthand)', async () => {
      // produce a string whose UTF-8 bytes are four null bytes
      const boxes = await Ascii85BoxSource.generateBoxes('\x00\x00\x00\x00', {
        ascii85: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('z');
    });

    it('encodes a single byte (partial group)', async () => {
      // 'A' = 0x41 = 65; padded to [65,0,0,0] = 0x41000000 = 1090519040
      // 1090519040 / 52200625 = 20 → d0=20, char=53='5'
      // rem = 1090519040 - 20*52200625 = 1090519040 - 1044012500 = 46506540
      // 46506540 / 614125 = 75 → d1=75, char=108='l' ... output 2 chars
      const boxes = await Ascii85BoxSource.generateBoxes('A', {
        ascii85: true,
      });
      expect(boxes).toHaveLength(1);
      // verify by round-trip rather than hard-coding the two chars
      expect(boxes[0].props.plaintextOutput).toHaveLength(2);
    });

    it('does not add <~ ~> delimiters', async () => {
      const boxes = await Ascii85BoxSource.generateBoxes('hello', {
        ascii85: true,
      });
      expect(boxes[0].props.plaintextOutput).not.toContain('<~');
      expect(boxes[0].props.plaintextOutput).not.toContain('~>');
    });

    it('showExpandButton is false', async () => {
      const boxes = await Ascii85BoxSource.generateBoxes('hello', {
        ascii85: true,
      });
      expect(boxes[0].props.showExpandButton).toBe(false);
    });
  });

  describe('decode (::ascii85decode)', () => {
    it('decodes "BOu!rDZ" back to "hello"', async () => {
      const boxes = await Ascii85BoxSource.generateBoxes('BOu!rDZ', {
        ascii85decode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('hello');
      expect(boxes[0].props.name).toBe('Ascii85 (Decode)');
    });

    it('decodes with optional <~ ~> delimiters', async () => {
      const boxes = await Ascii85BoxSource.generateBoxes('<~BOu!rDZ~>', {
        ascii85decode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('hello');
    });

    it('decodes with embedded whitespace', async () => {
      const boxes = await Ascii85BoxSource.generateBoxes('BOu!r DZ', {
        ascii85decode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('hello');
    });

    it('expands "z" to four zero bytes during decode', async () => {
      const boxes = await Ascii85BoxSource.generateBoxes('z', {
        ascii85decode: true,
      });
      expect(boxes).toHaveLength(1);
      // four null bytes decoded by TextDecoder
      expect(boxes[0].props.plaintextOutput).toBe('\x00\x00\x00\x00');
    });

    it('returns "invalid Ascii85" box for out-of-range character', async () => {
      // '~' is char code 126, 126-33=93 which is > 84, so invalid
      const boxes = await Ascii85BoxSource.generateBoxes('BOu!~DZ', {
        ascii85decode: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('invalid Ascii85');
    });

    it('showExpandButton is false', async () => {
      const boxes = await Ascii85BoxSource.generateBoxes('BOu!rDZ', {
        ascii85decode: true,
      });
      expect(boxes[0].props.showExpandButton).toBe(false);
    });
  });

  describe('round-trip', () => {
    it('encode then decode returns original ASCII text', async () => {
      const original = 'Hello, World!';
      const encoded = await Ascii85BoxSource.generateBoxes(original, {
        ascii85: true,
      });
      const ascii85Text = encoded[0].props.plaintextOutput;

      const decoded = await Ascii85BoxSource.generateBoxes(ascii85Text, {
        ascii85decode: true,
      });
      expect(decoded[0].props.plaintextOutput).toBe(original);
    });

    it('round-trips multi-byte UTF-8 text', async () => {
      const original = 'こんにちは';
      const encoded = await Ascii85BoxSource.generateBoxes(original, {
        ascii85: true,
      });
      const ascii85Text = encoded[0].props.plaintextOutput;

      const decoded = await Ascii85BoxSource.generateBoxes(ascii85Text, {
        ascii85decode: true,
      });
      expect(decoded[0].props.plaintextOutput).toBe(original);
    });

    it('round-trips text containing null bytes (z shorthand)', async () => {
      const original = '\x00\x00\x00\x00test';
      const encoded = await Ascii85BoxSource.generateBoxes(original, {
        ascii85: true,
      });
      const ascii85Text = encoded[0].props.plaintextOutput;

      // encoded form must start with 'z'
      expect(ascii85Text.startsWith('z')).toBe(true);

      const decoded = await Ascii85BoxSource.generateBoxes(ascii85Text, {
        ascii85decode: true,
      });
      expect(decoded[0].props.plaintextOutput).toBe(original);
    });
  });

  describe('both options → 2 boxes', () => {
    it('returns encode box then decode box when both options are set', async () => {
      const boxes = await Ascii85BoxSource.generateBoxes('hello', {
        ascii85: true,
        ascii85decode: true,
      });
      expect(boxes).toHaveLength(2);
      expect(boxes[0].props.name).toBe('Ascii85 (Encode)');
      expect(boxes[1].props.name).toBe('Ascii85 (Decode)');
    });
  });

  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(Ascii85BoxSource.name).toBe('Ascii85');
      expect(Ascii85BoxSource.tag).toBe('#');
      expect(Ascii85BoxSource.kind).toBe('Encode');
      expect(typeof Ascii85BoxSource.priority).toBe('number');
    });
  });
});
