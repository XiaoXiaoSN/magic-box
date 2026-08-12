import { describe, expect, it } from 'vitest';

import { UnicodeEscapeBoxSource } from '../UnicodeEscapeBoxSource';

describe('UnicodeEscapeBoxSource', () => {
  describe('generateBoxes - option gating', () => {
    it('returns empty array when no option is provided', async () => {
      const boxes = await UnicodeEscapeBoxSource.generateBoxes('hello', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty options object', async () => {
      const boxes = await UnicodeEscapeBoxSource.generateBoxes('hello', {});
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty string even with option', async () => {
      const boxes = await UnicodeEscapeBoxSource.generateBoxes('', {
        unicodeescape: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes - escape', () => {
    it('escapes non-ASCII: A€ → A\\u20ac', async () => {
      // '\\u20ac' here is the literal 6-character string backslash-u-2-0-a-c
      const boxes = await UnicodeEscapeBoxSource.generateBoxes('A€', {
        unicodeescape: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('A\\u20ac');
    });

    it('keeps printable ASCII unchanged: hi! stays hi!', async () => {
      const boxes = await UnicodeEscapeBoxSource.generateBoxes('hi!', {
        unicodeescape: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('hi!');
    });

    it('escapes astral char 😀 (U+1F600) as surrogate pair \\ud83d\\ude00', async () => {
      // 😀 = U+1F600 splits into surrogates U+D83D U+DE00
      const boxes = await UnicodeEscapeBoxSource.generateBoxes('😀', {
        unicodeescape: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('\\ud83d\\ude00');
    });

    it('accepts ::uescape alias', async () => {
      const boxes = await UnicodeEscapeBoxSource.generateBoxes('€', {
        uescape: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('\\u20ac');
    });

    it('sets box name to "Unicode Escape"', async () => {
      const boxes = await UnicodeEscapeBoxSource.generateBoxes('A', {
        unicodeescape: true,
      });
      expect(boxes[0].props.name).toBe('Unicode Escape');
    });

    it('sets priority to 10', async () => {
      const boxes = await UnicodeEscapeBoxSource.generateBoxes('A', {
        unicodeescape: true,
      });
      expect(boxes[0].props.priority).toBe(10);
    });
  });

  describe('generateBoxes - unescape', () => {
    it('unescapes \\u20ac back to €', async () => {
      // the input string contains literal backslash-u-20ac
      const boxes = await UnicodeEscapeBoxSource.generateBoxes('\\u20ac', {
        unicodeunescape: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('€');
    });

    it('unescapes braces form \\u{1f600} back to 😀', async () => {
      const boxes = await UnicodeEscapeBoxSource.generateBoxes('\\u{1f600}', {
        unicodeunescape: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('😀');
    });

    it('leaves text outside escape sequences unchanged', async () => {
      const boxes = await UnicodeEscapeBoxSource.generateBoxes(
        'hi \\u0021 there',
        { unicodeunescape: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('hi ! there');
    });

    it('guards invalid braces code point > 0x10ffff and leaves it literal', async () => {
      const boxes = await UnicodeEscapeBoxSource.generateBoxes('\\u{110000}', {
        unicodeunescape: true,
      });
      expect(boxes).toHaveLength(1);
      // code point is out of range — the sequence must remain as-is
      expect(boxes[0].props.plaintextOutput).toBe('\\u{110000}');
    });

    it('accepts ::uunescape alias', async () => {
      const boxes = await UnicodeEscapeBoxSource.generateBoxes('\\u0041', {
        uunescape: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('A');
    });

    it('sets box name to "Unicode Unescape"', async () => {
      const boxes = await UnicodeEscapeBoxSource.generateBoxes('\\u0041', {
        unicodeunescape: true,
      });
      expect(boxes[0].props.name).toBe('Unicode Unescape');
    });
  });

  describe('round-trip', () => {
    it('héllo escapes and unescapes back to the original', async () => {
      const original = 'héllo';

      const escapeBoxes = await UnicodeEscapeBoxSource.generateBoxes(original, {
        unicodeescape: true,
      });
      expect(escapeBoxes).toHaveLength(1);
      const escaped = escapeBoxes[0].props.plaintextOutput;

      const unescapeBoxes = await UnicodeEscapeBoxSource.generateBoxes(
        escaped,
        { unicodeunescape: true },
      );
      expect(unescapeBoxes).toHaveLength(1);
      expect(unescapeBoxes[0].props.plaintextOutput).toBe(original);
    });
  });

  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(UnicodeEscapeBoxSource.name).toBe('Unicode Escape');
      expect(UnicodeEscapeBoxSource.tag).toBe('#');
      expect(UnicodeEscapeBoxSource.kind).toBe('Encode');
      expect(UnicodeEscapeBoxSource.priority).toBe(10);
    });
  });
});
