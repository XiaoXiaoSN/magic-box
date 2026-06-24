import { CodeBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { ReverseTextBoxSource } from '../ReverseTextBoxSource';

describe('ReverseTextBoxSource', () => {
  describe('trigger conditions', () => {
    it('returns [] when no option is provided', async () => {
      const boxes = await ReverseTextBoxSource.generateBoxes('hello', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when an unrelated option is provided', async () => {
      const boxes = await ReverseTextBoxSource.generateBoxes('hello', {
        qr: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for empty input', async () => {
      const boxes = await ReverseTextBoxSource.generateBoxes('', {
        reverse: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('chars mode (default)', () => {
    it('reverses ascii string by characters', async () => {
      const boxes = await ReverseTextBoxSource.generateBoxes('hello', {
        reverse: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('olleh');
    });

    it('reverses mixed string with spaces', async () => {
      const boxes = await ReverseTextBoxSource.generateBoxes('abc 123', {
        reverse: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('321 cba');
    });

    it('reverses unicode precomposed char correctly (é as one code point)', async () => {
      const boxes = await ReverseTextBoxSource.generateBoxes('café', {
        reverse: true,
      });
      // é (U+00E9) is a single precomposed code point; must stay intact
      expect(boxes[0].props.plaintextOutput).toBe('éfac');
    });

    it('is code-point safe: emoji stays intact (a😀b → b😀a)', async () => {
      // verify the invariant the test depends on
      expect([...'a😀b'].reverse().join('')).toBe('b😀a');

      const boxes = await ReverseTextBoxSource.generateBoxes('a😀b', {
        reverse: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('b😀a');
    });

    it('is grapheme-safe: skin-tone emoji (👍🏽) stays intact', async () => {
      const input = '👍🏽';
      const boxes = await ReverseTextBoxSource.generateBoxes(input, {
        reverse: true,
      });
      // a single grapheme cluster reverses to itself (not split into base +
      // modifier) thanks to Intl.Segmenter
      expect(boxes[0].props.plaintextOutput).toBe('👍🏽');
    });

    it('reverses multiple grapheme clusters as whole units', async () => {
      const boxes = await ReverseTextBoxSource.generateBoxes('a👍🏽b', {
        reverse: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('b👍🏽a');
    });

    it('uses CodeBoxTemplate', async () => {
      const boxes = await ReverseTextBoxSource.generateBoxes('hello', {
        reverse: true,
      });
      expect(boxes[0].boxTemplate).toBe(CodeBoxTemplate);
    });

    it('sets the box name to "Reverse Text"', async () => {
      const boxes = await ReverseTextBoxSource.generateBoxes('hello', {
        reverse: true,
      });
      expect(boxes[0].props.name).toBe('Reverse Text');
    });
  });

  describe('words mode', () => {
    it('reverses word order', async () => {
      const boxes = await ReverseTextBoxSource.generateBoxes(
        'hello world foo',
        { reverse: 'words' },
      );
      expect(boxes[0].props.plaintextOutput).toBe('foo world hello');
    });

    it('collapses multiple spaces between words', async () => {
      const boxes = await ReverseTextBoxSource.generateBoxes('a  b   c', {
        reverse: 'words',
      });
      expect(boxes[0].props.plaintextOutput).toBe('c b a');
    });
  });

  describe('lines mode', () => {
    it('reverses line order', async () => {
      const boxes = await ReverseTextBoxSource.generateBoxes(
        'line1\nline2\nline3',
        { reverse: 'lines' },
      );
      expect(boxes[0].props.plaintextOutput).toBe('line3\nline2\nline1');
    });

    it('normalizes CRLF before reversing lines', async () => {
      const boxes = await ReverseTextBoxSource.generateBoxes('a\r\nb\r\nc', {
        reverse: 'lines',
      });
      expect(boxes[0].props.plaintextOutput).toBe('c\nb\na');
    });
  });

  describe('input length guard', () => {
    it('returns [] when input exceeds MAX_INPUT', async () => {
      const huge = 'x'.repeat(100_001);
      const boxes = await ReverseTextBoxSource.generateBoxes(huge, {
        reverse: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });
});
