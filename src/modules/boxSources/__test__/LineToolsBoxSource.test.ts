import { describe, expect, it } from 'vitest';

import { LineToolsBoxSource } from '../LineToolsBoxSource';

describe('LineToolsBoxSource', () => {
  describe('trigger guards', () => {
    it('returns empty array when no option is provided', async () => {
      const boxes = await LineToolsBoxSource.generateBoxes(
        'banana\napple',
        null,
      );
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty options object', async () => {
      const boxes = await LineToolsBoxSource.generateBoxes('banana\napple', {});
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty input', async () => {
      const boxes = await LineToolsBoxSource.generateBoxes('', {
        sortlines: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array when input exceeds MAX_INPUT', async () => {
      const big = 'a\n'.repeat(60_000);
      const boxes = await LineToolsBoxSource.generateBoxes(big, {
        sortlines: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('::sortlines', () => {
    it('sorts lines ascending by localeCompare', async () => {
      const boxes = await LineToolsBoxSource.generateBoxes(
        'banana\napple\ncherry',
        { sortlines: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Sorted Lines');
      expect(boxes[0].props.plaintextOutput).toBe('apple\nbanana\ncherry');
    });
  });

  describe('::uniquelines', () => {
    it('removes duplicate lines keeping first occurrence order', async () => {
      const boxes = await LineToolsBoxSource.generateBoxes('a\nb\na\nc\nb', {
        uniquelines: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Unique Lines');
      expect(boxes[0].props.plaintextOutput).toBe('a\nb\nc');
    });
  });

  describe('::reverselines', () => {
    it('reverses the order of lines', async () => {
      const boxes = await LineToolsBoxSource.generateBoxes('1\n2\n3', {
        reverselines: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Reversed Lines');
      expect(boxes[0].props.plaintextOutput).toBe('3\n2\n1');
    });
  });

  describe('combined options', () => {
    it('returns two boxes for ::sortlines + ::uniquelines', async () => {
      const boxes = await LineToolsBoxSource.generateBoxes('banana\napple', {
        sortlines: true,
        uniquelines: true,
      });
      expect(boxes).toHaveLength(2);
      const names = boxes.map((b) => b.props.name);
      expect(names).toContain('Sorted Lines');
      expect(names).toContain('Unique Lines');
    });

    it('returns three boxes when all three options are set', async () => {
      const boxes = await LineToolsBoxSource.generateBoxes(
        'banana\napple\ncherry',
        { sortlines: true, uniquelines: true, reverselines: true },
      );
      expect(boxes).toHaveLength(3);
      const names = boxes.map((b) => b.props.name);
      expect(names).toContain('Sorted Lines');
      expect(names).toContain('Unique Lines');
      expect(names).toContain('Reversed Lines');
    });
  });

  describe('CRLF tolerance', () => {
    it('strips trailing \\r from each line before processing', async () => {
      const boxes = await LineToolsBoxSource.generateBoxes(
        'banana\r\napple\r\ncherry\r\n',
        { sortlines: true },
      );
      expect(boxes).toHaveLength(1);
      // trailing empty string after final \n is sorted first, then words
      const output = boxes[0].props.plaintextOutput as string;
      expect(output).toContain('apple');
      expect(output).toContain('banana');
      expect(output).toContain('cherry');
      // no \r should remain in output
      expect(output).not.toContain('\r');
    });
  });

  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(LineToolsBoxSource.name).toBe('Line Tools');
      expect(LineToolsBoxSource.tag).toBe('#');
      expect(LineToolsBoxSource.kind).toBe('Transform');
      expect(typeof LineToolsBoxSource.priority).toBe('number');
    });
  });
});
