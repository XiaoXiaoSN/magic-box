import { describe, expect, it } from 'vitest';

import { TextWrapBoxSource } from '../TextWrapBoxSource';

describe('TextWrapBoxSource', () => {
  describe('generateBoxes', () => {
    it('returns [] when no wrap option is present', async () => {
      const boxes = await TextWrapBoxSource.generateBoxes('hello world');
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for empty input even with wrap option', async () => {
      const boxes = await TextWrapBoxSource.generateBoxes('', { wrap: '20' });
      expect(boxes).toHaveLength(0);
    });

    it('wraps "The quick brown fox..." at width 20 with greedy boundaries', async () => {
      const boxes = await TextWrapBoxSource.generateBoxes(
        'The quick brown fox jumps over the lazy dog',
        { wrap: '20' },
      );
      expect(boxes).toHaveLength(1);
      // greedy: 'The quick brown fox' = 19 chars (fits), 'jumps over the lazy' = 19 chars (fits), 'dog'
      expect(boxes[0].props.plaintextOutput).toBe(
        'The quick brown fox\njumps over the lazy\ndog',
      );
    });

    it('wraps "aaa bbb ccc" at width 10 correctly', async () => {
      const boxes = await TextWrapBoxSource.generateBoxes('aaa bbb ccc', {
        wrap: '10',
      });
      expect(boxes).toHaveLength(1);
      // 'aaa bbb' = 7 chars, adding ' ccc' = 11 > 10, so new line
      expect(boxes[0].props.plaintextOutput).toBe('aaa bbb\nccc');
    });

    it('places a long word exceeding width on its own line without breaking', async () => {
      const boxes = await TextWrapBoxSource.generateBoxes(
        'supercalifragilistic',
        { wrap: '5' },
      );
      expect(boxes).toHaveLength(1);
      // the word is longer than width=5 but is not broken mid-word
      expect(boxes[0].props.plaintextOutput).toBe('supercalifragilistic');
    });

    it('preserves blank lines between paragraphs', async () => {
      const boxes = await TextWrapBoxSource.generateBoxes(
        'line one here\n\nline two here',
        { wrap: '10' },
      );
      expect(boxes).toHaveLength(1);
      const output = boxes[0].props.plaintextOutput;
      // blank line must be preserved as a paragraph boundary
      expect(output).toContain('\n\n');
      // each paragraph line should not exceed 10 chars where words permit
      const lines = output.split('\n');
      for (const line of lines) {
        if (line.trim().length > 0) {
          // single words may exceed width, but joined lines should not
          // 'line one' = 8, 'here' = 4 — all fit within 10
          expect(line.length).toBeLessThanOrEqual(10);
        }
      }
    });

    it('uses default width 80 when ::wrap has no numeric value', async () => {
      const boxes = await TextWrapBoxSource.generateBoxes('a b c', {
        wrap: true,
      });
      expect(boxes).toHaveLength(1);
      // 'a b c' is 5 chars, well within 80 — no line breaks added
      expect(boxes[0].props.plaintextOutput).toBe('a b c');
    });

    it('triggers on ::wordwrap option as well', async () => {
      const boxes = await TextWrapBoxSource.generateBoxes(
        'The quick brown fox jumps over the lazy dog',
        { wordwrap: '20' },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe(
        'The quick brown fox\njumps over the lazy\ndog',
      );
    });

    it('sets box name to "Text Wrap" and correct priority', async () => {
      const boxes = await TextWrapBoxSource.generateBoxes('hello world', {
        wrap: '80',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Text Wrap');
      expect(boxes[0].props.priority).toBe(10);
    });
  });
});
