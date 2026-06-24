import { CodeBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { WordWrapBoxSource } from '../WordWrapBoxSource';

describe('WordWrapBoxSource', () => {
  describe('generateBoxes', () => {
    it('should return empty array when no wrap option is provided', async () => {
      const boxes = await WordWrapBoxSource.generateBoxes(
        'The quick brown fox',
        null,
      );
      expect(boxes).toHaveLength(0);
    });

    it('should return empty array for empty input', async () => {
      const boxes = await WordWrapBoxSource.generateBoxes('', { wrap: '20' });
      expect(boxes).toHaveLength(0);
    });

    it('should wrap text at word boundaries respecting the given width', async () => {
      const boxes = await WordWrapBoxSource.generateBoxes(
        'The quick brown fox jumps over the lazy dog',
        { wrap: '20' },
      );
      expect(boxes).toHaveLength(1);

      const output: string = boxes[0].props.plaintextOutput;
      // every line must be at most 20 characters
      for (const line of output.split('\n')) {
        expect(line.length).toBeLessThanOrEqual(20);
      }
      // greedy pack: verify exact expected output
      expect(output).toBe('The quick brown fox\njumps over the lazy\ndog');
    });

    it('should not split a word that exceeds the width', async () => {
      const boxes = await WordWrapBoxSource.generateBoxes(
        'supercalifragilistic',
        { wrap: '5' },
      );
      expect(boxes).toHaveLength(1);

      const lines = boxes[0].props.plaintextOutput.split('\n');
      // the long word must appear intact on its own line
      expect(lines).toContain('supercalifragilistic');
      // it must not be split across multiple lines
      expect(lines.length).toBe(1);
    });

    it('should preserve existing newlines across independent paragraph wrapping', async () => {
      const boxes = await WordWrapBoxSource.generateBoxes('a b\nc d', {
        wrap: '80',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('a b\nc d');
    });

    it('should use DEFAULT_WIDTH of 80 when ::wrap is used without a value', async () => {
      const longLine = 'word '.repeat(20).trimEnd(); // 99 chars
      const boxes = await WordWrapBoxSource.generateBoxes(longLine, {
        wrap: true,
      });
      expect(boxes).toHaveLength(1);

      for (const line of boxes[0].props.plaintextOutput.split('\n')) {
        expect(line.length).toBeLessThanOrEqual(80);
      }
    });

    it('should use DEFAULT_WIDTH of 80 when ::wordwrap is used without a value', async () => {
      const longLine = 'word '.repeat(20).trimEnd();
      const boxes = await WordWrapBoxSource.generateBoxes(longLine, {
        wordwrap: true,
      });
      expect(boxes).toHaveLength(1);

      for (const line of boxes[0].props.plaintextOutput.split('\n')) {
        expect(line.length).toBeLessThanOrEqual(80);
      }
    });

    it('should set CodeBoxTemplate on the returned box', async () => {
      const boxes = await WordWrapBoxSource.generateBoxes(
        'The quick brown fox',
        { wrap: '20' },
      );
      expect(boxes[0].boxTemplate).toBe(CodeBoxTemplate);
    });

    it('should set priority from WordWrapBoxSource.priority', async () => {
      const boxes = await WordWrapBoxSource.generateBoxes(
        'The quick brown fox',
        { wrap: '20' },
      );
      expect(boxes[0].props.priority).toBe(WordWrapBoxSource.priority);
    });

    it('should accept ::wordwrap as an alias for ::wrap', async () => {
      const boxes = await WordWrapBoxSource.generateBoxes(
        'The quick brown fox jumps over the lazy dog',
        { wordwrap: '20' },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe(
        'The quick brown fox\njumps over the lazy\ndog',
      );
    });

    it('preserves leading indentation on the first wrapped line', async () => {
      const boxes = await WordWrapBoxSource.generateBoxes('    hello world', {
        wrap: '80',
      });
      expect(boxes[0].props.plaintextOutput).toBe('    hello world');
    });
  });
});
