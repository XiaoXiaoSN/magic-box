import { describe, expect, it } from 'vitest';

import { HammingDistanceBoxSource } from '../HammingDistanceBoxSource';

describe('HammingDistanceBoxSource', () => {
  describe('generateBoxes - no option', () => {
    it('returns empty array when no hamming option is provided', async () => {
      const boxes = await HammingDistanceBoxSource.generateBoxes(
        'karolin\nkathrin',
        null,
      );
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty options object', async () => {
      const boxes = await HammingDistanceBoxSource.generateBoxes(
        'karolin\nkathrin',
        {},
      );
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes - classic string example', () => {
    it('karolin vs kathrin → Distance 3, Length 7', async () => {
      // k=k, a=a, r≠t, o≠h, l≠r, i=i, n=n → 3 differences
      const boxes = await HammingDistanceBoxSource.generateBoxes(
        'karolin\nkathrin',
        { hamming: true },
      );
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Distance).toBe('3');
      expect(opts.Length).toBe('7');
    });
  });

  describe('generateBoxes - identical strings', () => {
    it('abc vs abc → Distance 0, Similarity 100.0%', async () => {
      const boxes = await HammingDistanceBoxSource.generateBoxes('abc\nabc', {
        hamming: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Distance).toBe('0');
      expect(opts.Similarity).toBe('100.0%');
    });
  });

  describe('generateBoxes - classic binary example', () => {
    it('1011101 vs 1001001 → Distance 2', async () => {
      // 1=1, 0=0, 1≠0, 1=1, 1≠0, 0=0, 1=1 → 2 differences
      const boxes = await HammingDistanceBoxSource.generateBoxes(
        '1011101\n1001001',
        { hamming: true },
      );
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Distance).toBe('2');
    });
  });

  describe('generateBoxes - error cases', () => {
    it('different-length strings → box mentioning equal-length required', async () => {
      const boxes = await HammingDistanceBoxSource.generateBoxes('ab\nabc', {
        hamming: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Info).toMatch(/equal-length/i);
    });

    it('no newline → box mentioning two strings are required', async () => {
      const boxes = await HammingDistanceBoxSource.generateBoxes('abc', {
        hamming: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Info).toMatch(/two newline-separated strings are required/i);
    });
  });

  describe('generateBoxes - plaintext output', () => {
    it('plaintextOutput contains k:v lines', async () => {
      const boxes = await HammingDistanceBoxSource.generateBoxes(
        'karolin\nkathrin',
        { hamming: true },
      );
      expect(boxes[0].props.plaintextOutput).toContain('Distance: 3');
      expect(boxes[0].props.plaintextOutput).toContain('Length: 7');
    });
  });

  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(HammingDistanceBoxSource.name).toBe('Hamming Distance');
      expect(HammingDistanceBoxSource.tag).toBe('#');
      expect(HammingDistanceBoxSource.kind).toBe('Analyze');
      expect(typeof HammingDistanceBoxSource.priority).toBe('number');
    });
  });
});
