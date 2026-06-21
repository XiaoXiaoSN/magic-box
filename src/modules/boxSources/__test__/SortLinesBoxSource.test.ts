import { describe, expect, it } from 'vitest';

import { SortLinesBoxSource } from '../SortLinesBoxSource';

describe('SortLinesBoxSource', () => {
  describe('generateBoxes — gating', () => {
    it('returns [] when no relevant option is present', async () => {
      const boxes = await SortLinesBoxSource.generateBoxes(
        'banana\napple',
        null,
      );
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for empty input even with ::sortlines', async () => {
      const boxes = await SortLinesBoxSource.generateBoxes('', {
        sortlines: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when input exceeds MAX_INPUT', async () => {
      const huge = 'a'.repeat(100_001);
      const boxes = await SortLinesBoxSource.generateBoxes(huge, {
        sortlines: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes — sort ascending (default)', () => {
    it('sorts lines lexicographically ascending with ::sortlines=true', async () => {
      const boxes = await SortLinesBoxSource.generateBoxes(
        'banana\napple\ncherry',
        {
          sortlines: true,
        },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('apple\nbanana\ncherry');
    });

    it('sorts ascending with ::sortlines=asc', async () => {
      const boxes = await SortLinesBoxSource.generateBoxes(
        'banana\napple\ncherry',
        {
          sortlines: 'asc',
        },
      );
      expect(boxes[0].props.plaintextOutput).toBe('apple\nbanana\ncherry');
    });
  });

  describe('generateBoxes — sort descending', () => {
    it('sorts lines descending with ::sortlines=desc', async () => {
      const boxes = await SortLinesBoxSource.generateBoxes(
        'banana\napple\ncherry',
        {
          sortlines: 'desc',
        },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('cherry\nbanana\napple');
    });
  });

  describe('generateBoxes — numeric sort', () => {
    it('sorts numerically ascending with ::sortlines=num', async () => {
      const boxes = await SortLinesBoxSource.generateBoxes('10\n2\n1', {
        sortlines: 'num',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('1\n2\n10');
    });

    it('sorts numerically descending with ::sortlines=numdesc', async () => {
      const boxes = await SortLinesBoxSource.generateBoxes('10\n2\n1', {
        sortlines: 'numdesc',
      });
      expect(boxes[0].props.plaintextOutput).toBe('10\n2\n1');
    });

    it('places NaN lines last in numeric sort', async () => {
      const boxes = await SortLinesBoxSource.generateBoxes('foo\n2\n1', {
        sortlines: 'num',
      });
      expect(boxes[0].props.plaintextOutput).toBe('1\n2\nfoo');
    });
  });

  describe('generateBoxes — dedupe only', () => {
    it('removes duplicate lines preserving first-occurrence order with ::uniqlines', async () => {
      const boxes = await SortLinesBoxSource.generateBoxes('a\nb\na\nc', {
        uniqlines: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('a\nb\nc');
    });

    it('accepts ::dedupelines as an alias', async () => {
      const boxes = await SortLinesBoxSource.generateBoxes('a\nb\na\nc', {
        dedupelines: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('a\nb\nc');
    });
  });

  describe('generateBoxes — sort + dedupe combined', () => {
    it('dedupes then sorts ascending', async () => {
      const boxes = await SortLinesBoxSource.generateBoxes('b\na\nb', {
        sortlines: true,
        uniqlines: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('a\nb');
    });
  });

  describe('generateBoxes — box metadata', () => {
    it('sets name to "Sort Lines" and uses CodeBoxTemplate', async () => {
      const boxes = await SortLinesBoxSource.generateBoxes('banana\napple', {
        sortlines: true,
      });
      expect(boxes[0].props.name).toBe('Sort Lines');
      expect(boxes[0].props.priority).toBe(10);
      expect(boxes[0].boxTemplate).toBeDefined();
    });
  });

  describe('generateBoxes — line ending handling', () => {
    it('handles \\r\\n line endings', async () => {
      const boxes = await SortLinesBoxSource.generateBoxes(
        'banana\r\napple\r\ncherry',
        {
          sortlines: true,
        },
      );
      expect(boxes[0].props.plaintextOutput).toBe('apple\nbanana\ncherry');
    });
  });
});
