import { describe, expect, it } from 'vitest';

import { WhitespaceNormalizeBoxSource } from '../WhitespaceNormalizeBoxSource';

describe('WhitespaceNormalizeBoxSource', () => {
  describe('generateBoxes', () => {
    it('returns [] when no option keys present', async () => {
      const boxes = await WhitespaceNormalizeBoxSource.generateBoxes(
        'foo   \n\n\n  bar  \n\n',
      );
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for empty input even with option key', async () => {
      const boxes = await WhitespaceNormalizeBoxSource.generateBoxes('', {
        trimlines: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('trimlines: strips trailing spaces, collapses blank lines, trims leading/trailing blank lines', async () => {
      const boxes = await WhitespaceNormalizeBoxSource.generateBoxes(
        'foo   \n\n\n  bar  \n\n',
        { trimlines: true },
      );
      expect(boxes).toHaveLength(1);
      // trailing spaces stripped, triple blank → single blank, trailing blank line gone; leading indent on bar kept
      expect(boxes[0].props.plaintextOutput).toBe('foo\n\n  bar');
    });

    it('trimlines: strips trailing spaces only', async () => {
      const boxes = await WhitespaceNormalizeBoxSource.generateBoxes(
        'a   \nb\t',
        { trimlines: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('a\nb');
    });

    it('normalizews: collapses internal runs of spaces/tabs to a single space', async () => {
      const boxes = await WhitespaceNormalizeBoxSource.generateBoxes('a    b', {
        normalizews: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('a b');
    });

    it('normalizews: trims leading whitespace per line', async () => {
      const boxes = await WhitespaceNormalizeBoxSource.generateBoxes('   x', {
        normalizews: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('x');
    });

    it('trimlines: normalizes CRLF to LF', async () => {
      const boxes = await WhitespaceNormalizeBoxSource.generateBoxes('a\r\nb', {
        trimlines: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('a\nb');
    });

    it('box has correct name and priority', async () => {
      const boxes = await WhitespaceNormalizeBoxSource.generateBoxes('hello', {
        trimlines: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Normalize Whitespace');
      expect(boxes[0].props.priority).toBe(10);
    });
  });
});
