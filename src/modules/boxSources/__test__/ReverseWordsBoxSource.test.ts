import { describe, expect, it } from 'vitest';

import { ReverseWordsBoxSource } from '../ReverseWordsBoxSource';

describe('ReverseWordsBoxSource', () => {
  describe('generateBoxes - option gate', () => {
    it('returns empty array when no option is provided', async () => {
      const boxes = await ReverseWordsBoxSource.generateBoxes(
        'the quick brown fox',
        null,
      );
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array when reversewords option is absent', async () => {
      const boxes = await ReverseWordsBoxSource.generateBoxes(
        'the quick brown fox',
        {},
      );
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty input even with reversewords option', async () => {
      const boxes = await ReverseWordsBoxSource.generateBoxes('', {
        reversewords: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for whitespace-only input', async () => {
      const boxes = await ReverseWordsBoxSource.generateBoxes('   ', {
        reversewords: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes - word reversal', () => {
    it('reverses word order for a normal sentence', async () => {
      const boxes = await ReverseWordsBoxSource.generateBoxes(
        'the quick brown fox',
        { reversewords: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('fox brown quick the');
    });

    it('collapses multiple spaces between words', async () => {
      const boxes = await ReverseWordsBoxSource.generateBoxes('a   b', {
        reversewords: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('b a');
    });

    it('returns the same word for single-word input', async () => {
      const boxes = await ReverseWordsBoxSource.generateBoxes('hello', {
        reversewords: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('hello');
    });

    it('double reverse restores original word order', async () => {
      const original = 'the quick brown fox';
      const first = await ReverseWordsBoxSource.generateBoxes(original, {
        reversewords: true,
      });
      const reversed = first[0].props.plaintextOutput as string;

      const second = await ReverseWordsBoxSource.generateBoxes(reversed, {
        reversewords: true,
      });
      expect(second[0].props.plaintextOutput).toBe(original);
    });
  });

  describe('generateBoxes - box properties', () => {
    it('sets the box name to "Reverse Words"', async () => {
      const boxes = await ReverseWordsBoxSource.generateBoxes(
        'the quick brown fox',
        { reversewords: true },
      );
      expect(boxes[0].props.name).toBe('Reverse Words');
    });

    it('sets priority from source priority', async () => {
      const boxes = await ReverseWordsBoxSource.generateBoxes(
        'the quick brown fox',
        { reversewords: true },
      );
      expect(boxes[0].props.priority).toBe(10);
    });
  });
});
