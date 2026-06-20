import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { TextReverseBoxSource } from '../TextReverseBoxSource';

describe('TextReverseBoxSource', () => {
  describe('generateBoxes - option guard', () => {
    it('returns empty array when no option is provided', async () => {
      const boxes = await TextReverseBoxSource.generateBoxes('hello', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty options object', async () => {
      const boxes = await TextReverseBoxSource.generateBoxes('hello', {});
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty input string', async () => {
      const boxes = await TextReverseBoxSource.generateBoxes('', {
        reverse: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes - basic reversal', () => {
    it('reverses "hello" to "olleh"', async () => {
      const boxes = await TextReverseBoxSource.generateBoxes('hello', {
        reverse: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Text Reverse');
      expect(boxes[0].props.plaintextOutput).toBe('olleh');
      expect(boxes[0].props.priority).toBe(10);
      expect(boxes[0].boxTemplate).toBe(DefaultBoxTemplate);
    });

    it('reverses "abc123" to "321cba"', async () => {
      const boxes = await TextReverseBoxSource.generateBoxes('abc123', {
        reverse: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('321cba');
    });

    it('also triggers on "reversetext" option key', async () => {
      const boxes = await TextReverseBoxSource.generateBoxes('hello', {
        reversetext: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('olleh');
    });
  });

  describe('generateBoxes - Unicode / astral safety', () => {
    it('keeps emoji intact: "a😀b" → "b😀a"', async () => {
      const boxes = await TextReverseBoxSource.generateBoxes('a😀b', {
        reverse: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('b😀a');
    });

    it('double-reverse returns the original string', async () => {
      const original = 'hello 😀 world';
      const [first] = await TextReverseBoxSource.generateBoxes(original, {
        reverse: true,
      });
      const reversed = first.props.plaintextOutput as string;
      const [second] = await TextReverseBoxSource.generateBoxes(reversed, {
        reverse: true,
      });
      expect(second.props.plaintextOutput).toBe(original);
    });
  });
});
