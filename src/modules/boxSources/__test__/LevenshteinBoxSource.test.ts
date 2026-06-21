import { describe, expect, it } from 'vitest';

import { LevenshteinBoxSource } from '../LevenshteinBoxSource';

describe('LevenshteinBoxSource', () => {
  describe('generateBoxes - option gate', () => {
    it('returns empty array when no option is provided', async () => {
      const boxes = await LevenshteinBoxSource.generateBoxes(
        'kitten\nsitting',
        null,
      );
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty options object', async () => {
      const boxes = await LevenshteinBoxSource.generateBoxes(
        'kitten\nsitting',
        {},
      );
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes - ::levenshtein trigger', () => {
    it('kitten vs sitting yields distance 3', async () => {
      const boxes = await LevenshteinBoxSource.generateBoxes(
        'kitten\nsitting',
        { levenshtein: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.Distance).toBe('3');
    });

    it('identical strings yield distance 0 and similarity 100.0%', async () => {
      const boxes = await LevenshteinBoxSource.generateBoxes('abc\nabc', {
        levenshtein: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options;
      expect(opts?.Distance).toBe('0');
      expect(opts?.Similarity).toBe('100.0%');
    });

    it('fully different strings of equal length yield distance 3 and similarity 0.0%', async () => {
      const boxes = await LevenshteinBoxSource.generateBoxes('abc\nxyz', {
        levenshtein: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options;
      expect(opts?.Distance).toBe('3');
      expect(opts?.Similarity).toBe('0.0%');
    });

    it('flaw vs lawn yields distance 2', async () => {
      const boxes = await LevenshteinBoxSource.generateBoxes('flaw\nlawn', {
        levenshtein: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.Distance).toBe('2');
    });
  });

  describe('generateBoxes - ::editdistance alias', () => {
    it('accepts ::editdistance option', async () => {
      const boxes = await LevenshteinBoxSource.generateBoxes(
        'kitten\nsitting',
        { editdistance: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.Distance).toBe('3');
    });
  });

  describe('generateBoxes - single line without newline', () => {
    it('returns an informational box when input has no newline', async () => {
      const boxes = await LevenshteinBoxSource.generateBoxes('abc', {
        levenshtein: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/two.*strings.*required/i);
    });
  });

  describe('generateBoxes - length fields', () => {
    it('reports correct Length A and Length B', async () => {
      const boxes = await LevenshteinBoxSource.generateBoxes(
        'kitten\nsitting',
        { levenshtein: true },
      );
      const opts = boxes[0].props.options;
      expect(opts?.['Length A']).toBe('6');
      expect(opts?.['Length B']).toBe('7');
    });
  });

  describe('generateBoxes - both-empty edge case', () => {
    it('both empty strings yield distance 0 and similarity 100.0%', async () => {
      const boxes = await LevenshteinBoxSource.generateBoxes('\n', {
        levenshtein: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options;
      expect(opts?.Distance).toBe('0');
      expect(opts?.Similarity).toBe('100.0%');
    });
  });

  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(LevenshteinBoxSource.name).toBe('Levenshtein');
      expect(LevenshteinBoxSource.tag).toBe('#');
      expect(LevenshteinBoxSource.kind).toBe('Analyze');
      expect(typeof LevenshteinBoxSource.priority).toBe('number');
    });
  });
});
