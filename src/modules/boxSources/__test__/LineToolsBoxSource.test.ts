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

    it('returns an error box when input exceeds MAX_INPUT', async () => {
      const big = 'a\n'.repeat(60_000);
      const boxes = await LineToolsBoxSource.generateBoxes(big, {
        uniquelines: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/too large/i);
    });
  });

  describe('::sortlines ownership', () => {
    it('leaves sorting to Sort Lines', async () => {
      const boxes = await LineToolsBoxSource.generateBoxes(
        'banana\napple\ncherry',
        { sortlines: true },
      );
      expect(boxes).toHaveLength(0);
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
    it('returns one box for ::uniquelines', async () => {
      const boxes = await LineToolsBoxSource.generateBoxes('banana\napple', {
        uniquelines: true,
      });
      expect(boxes).toHaveLength(1);
      const names = boxes.map((b) => b.props.name);
      expect(names).toContain('Unique Lines');
    });

    it('returns two boxes when both line operations are set', async () => {
      const boxes = await LineToolsBoxSource.generateBoxes(
        'banana\napple\ncherry',
        { uniquelines: true, reverselines: true },
      );
      expect(boxes).toHaveLength(2);
      const names = boxes.map((b) => b.props.name);
      expect(names).toContain('Unique Lines');
      expect(names).toContain('Reversed Lines');
    });
  });

  describe('CRLF tolerance', () => {
    it('strips trailing \\r from each line before processing', async () => {
      const boxes = await LineToolsBoxSource.generateBoxes(
        'banana\r\napple\r\ncherry\r\n',
        { uniquelines: true },
      );
      expect(boxes).toHaveLength(1);
      // CRLF line endings are normalized before duplicate filtering.
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
    });
  });
});
