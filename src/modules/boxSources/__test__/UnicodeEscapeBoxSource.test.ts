import { describe, expect, it } from 'vitest';
import { UnicodeEscapeBoxSource } from '../UnicodeEscapeBoxSource';

describe('UnicodeEscapeBoxSource', () => {
  describe('generateBoxes', () => {
    it('returns [] when no option is provided', async () => {
      const boxes = await UnicodeEscapeBoxSource.generateBoxes('café');
      expect(boxes).toEqual([]);
    });

    it('returns [] when options is null', async () => {
      const boxes = await UnicodeEscapeBoxSource.generateBoxes('café', null);
      expect(boxes).toEqual([]);
    });

    it('escapes non-ASCII chars; printable ASCII stays literal', async () => {
      const boxes = await UnicodeEscapeBoxSource.generateBoxes('café', {
        unicodeescape: true,
      });
      expect(boxes).toHaveLength(1);
      // é = U+00E9; c, a, f are printable ASCII
      expect(boxes[0].props.plaintextOutput).toBe('caf\\u00e9');
    });

    it('accepts ::uescape alias', async () => {
      const boxes = await UnicodeEscapeBoxSource.generateBoxes('café', {
        uescape: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('caf\\u00e9');
    });

    it('escapes astral char as surrogate pair', async () => {
      // 😀 is U+1F600, surrogate pair: 😀
      const boxes = await UnicodeEscapeBoxSource.generateBoxes('😀', {
        unicodeescape: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('\\ud83d\\ude00');
    });

    it('unescapes \\uXXXX sequences', async () => {
      const boxes = await UnicodeEscapeBoxSource.generateBoxes('caf\\u00e9', {
        unicodeunescape: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('café');
    });

    it('accepts ::uunescape alias', async () => {
      const boxes = await UnicodeEscapeBoxSource.generateBoxes('caf\\u00e9', {
        uunescape: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('café');
    });

    it('unescapes \\u{HEX} code point escapes', async () => {
      const boxes = await UnicodeEscapeBoxSource.generateBoxes('\\u{1f600}', {
        unicodeunescape: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('😀');
    });

    it('leaves invalid code points (> 0x10FFFF) verbatim', async () => {
      const boxes = await UnicodeEscapeBoxSource.generateBoxes('\\u{110000}', {
        unicodeunescape: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('\\u{110000}');
    });

    it('round-trips: unescape(escape(s)) === s', async () => {
      const original = 'héllo 😀';
      const escapeBoxes = await UnicodeEscapeBoxSource.generateBoxes(original, {
        unicodeescape: true,
      });
      const escaped = escapeBoxes[0].props.plaintextOutput;

      const unescapeBoxes = await UnicodeEscapeBoxSource.generateBoxes(
        escaped,
        { unicodeunescape: true },
      );
      expect(unescapeBoxes[0].props.plaintextOutput).toBe(original);
    });

    it('returns 2 boxes when both escape and unescape options are set', async () => {
      const boxes = await UnicodeEscapeBoxSource.generateBoxes('café', {
        unicodeescape: true,
        unicodeunescape: true,
      });
      expect(boxes).toHaveLength(2);
      expect(boxes[0].props.name).toBe('Unicode Escape (Escape)');
      expect(boxes[1].props.name).toBe('Unicode Escape (Unescape)');
    });

    it('returns [] when input exceeds MAX_INPUT', async () => {
      const longInput = 'a'.repeat(100_001);
      const boxes = await UnicodeEscapeBoxSource.generateBoxes(longInput, {
        unicodeescape: true,
      });
      expect(boxes).toEqual([]);
    });

    it('box has showExpandButton false', async () => {
      const boxes = await UnicodeEscapeBoxSource.generateBoxes('hi', {
        unicodeescape: true,
      });
      expect(boxes[0].props.showExpandButton).toBe(false);
    });

    it('box has correct priority', async () => {
      const boxes = await UnicodeEscapeBoxSource.generateBoxes('hi', {
        unicodeescape: true,
      });
      expect(boxes[0].props.priority).toBe(10);
    });
  });
});
