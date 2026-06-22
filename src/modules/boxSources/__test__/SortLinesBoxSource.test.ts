import { describe, expect, it } from 'vitest';

import { SortLinesBoxSource } from '../SortLinesBoxSource';

describe('SortLinesBoxSource', () => {
  describe('generateBoxes - guard conditions', () => {
    it('returns empty array when no sort option is provided', async () => {
      const boxes = await SortLinesBoxSource.generateBoxes(
        'banana\napple',
        null,
      );
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array when options object has no sort key', async () => {
      const boxes = await SortLinesBoxSource.generateBoxes('banana\napple', {});
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty input string', async () => {
      const boxes = await SortLinesBoxSource.generateBoxes('', {
        sortlines: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes - ascending (default)', () => {
    it('sorts lines alphabetically ascending', async () => {
      const boxes = await SortLinesBoxSource.generateBoxes(
        'banana\napple\ncherry',
        { sortlines: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('apple\nbanana\ncherry');
    });

    it('triggers on ::sort alias', async () => {
      const boxes = await SortLinesBoxSource.generateBoxes(
        'banana\napple\ncherry',
        { sort: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('apple\nbanana\ncherry');
    });

    it('uses code-point order — uppercase sorts before lowercase', async () => {
      // 'B' (0x42) < 'a' (0x61) in code-point order
      const boxes = await SortLinesBoxSource.generateBoxes('a\nB', {
        sortlines: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('B\na');
    });
  });

  describe('generateBoxes - descending', () => {
    it('sorts lines descending with ::desc', async () => {
      const boxes = await SortLinesBoxSource.generateBoxes(
        'banana\napple\ncherry',
        { sortlines: true, desc: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('cherry\nbanana\napple');
    });

    it('sorts lines descending with ::reverse', async () => {
      const boxes = await SortLinesBoxSource.generateBoxes(
        'banana\napple\ncherry',
        { sortlines: true, reverse: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('cherry\nbanana\napple');
    });
  });

  describe('generateBoxes - numeric', () => {
    it('sorts numbers numerically, not lexicographically', async () => {
      const boxes = await SortLinesBoxSource.generateBoxes('10\n2\n1', {
        sortlines: true,
        numeric: true,
      });
      expect(boxes).toHaveLength(1);
      // numeric: 1 < 2 < 10 (string sort would give '1\n10\n2')
      expect(boxes[0].props.plaintextOutput).toBe('1\n2\n10');
    });

    it('places NaN values last', async () => {
      const boxes = await SortLinesBoxSource.generateBoxes('5\nfoo\n1', {
        sortlines: true,
        numeric: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('1\n5\nfoo');
    });
  });

  describe('generateBoxes - unique', () => {
    it('removes duplicate lines after sorting', async () => {
      const boxes = await SortLinesBoxSource.generateBoxes('b\na\nb\na', {
        sortlines: true,
        unique: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('a\nb');
    });

    it('triggers on ::uniq alias', async () => {
      const boxes = await SortLinesBoxSource.generateBoxes('z\na\nz', {
        sortlines: true,
        uniq: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('a\nz');
    });
  });

  describe('generateBoxes - case-insensitive', () => {
    it('sorts case-insensitively with ::ci', async () => {
      const boxes = await SortLinesBoxSource.generateBoxes('Banana\napple', {
        sortlines: true,
        ci: true,
      });
      expect(boxes).toHaveLength(1);
      // 'apple' < 'banana' case-insensitively; original casing preserved
      expect(boxes[0].props.plaintextOutput).toBe('apple\nBanana');
    });

    it('triggers on ::caseinsensitive alias', async () => {
      const boxes = await SortLinesBoxSource.generateBoxes('Banana\napple', {
        sortlines: true,
        caseinsensitive: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('apple\nBanana');
    });
  });

  describe('generateBoxes - CRLF normalization', () => {
    it('handles CRLF line endings', async () => {
      const boxes = await SortLinesBoxSource.generateBoxes(
        'banana\r\napple\r\ncherry',
        { sortlines: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('apple\nbanana\ncherry');
    });
  });

  describe('box metadata', () => {
    it('sets correct name and priority', async () => {
      const boxes = await SortLinesBoxSource.generateBoxes('b\na', {
        sortlines: true,
      });
      expect(boxes[0].props.name).toBe('Sort Lines');
      expect(boxes[0].props.priority).toBe(10);
    });

    it('attaches CodeBoxTemplate', async () => {
      const boxes = await SortLinesBoxSource.generateBoxes('b\na', {
        sortlines: true,
      });
      expect(boxes[0].boxTemplate).toBeDefined();
    });
  });

  describe('static metadata', () => {
    it('has expected static properties', () => {
      expect(SortLinesBoxSource.name).toBe('Sort Lines');
      expect(SortLinesBoxSource.kind).toBe('Transform');
      expect(typeof SortLinesBoxSource.priority).toBe('number');
    });
  });
});
