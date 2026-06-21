import { describe, expect, it } from 'vitest';

import { SqlInBoxSource } from '../SqlInBoxSource';

describe('SqlInBoxSource', () => {
  describe('option gate', () => {
    it('returns [] when no option is provided', async () => {
      const boxes = await SqlInBoxSource.generateBoxes('apple\nbanana', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when unrelated option is provided', async () => {
      const boxes = await SqlInBoxSource.generateBoxes('apple\nbanana', {
        hash: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('empty / blank input', () => {
    it('returns [] for empty string', async () => {
      const boxes = await SqlInBoxSource.generateBoxes('', { sqlin: true });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for whitespace-only string', async () => {
      const boxes = await SqlInBoxSource.generateBoxes('   \n  ', {
        sqlin: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when all tokens are empty after splitting', async () => {
      // input is only delimiters
      const boxes = await SqlInBoxSource.generateBoxes(',,,\n,,', {
        sqlin: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('string values', () => {
    it('wraps newline-separated strings in single quotes', async () => {
      const boxes = await SqlInBoxSource.generateBoxes('apple\nbanana', {
        sqlin: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe("IN ('apple', 'banana')");
    });

    it('trims whitespace around each token', async () => {
      const boxes = await SqlInBoxSource.generateBoxes(
        '  apple  \n  banana  ',
        {
          sqlin: true,
        },
      );
      expect(boxes[0].props.plaintextOutput).toBe("IN ('apple', 'banana')");
    });
  });

  describe('numeric values', () => {
    it('emits integers unquoted', async () => {
      const boxes = await SqlInBoxSource.generateBoxes('1,2,3', {
        sqlin: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('IN (1, 2, 3)');
    });

    it('emits decimal numbers unquoted', async () => {
      const boxes = await SqlInBoxSource.generateBoxes('1.5,2.75', {
        sqlin: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('IN (1.5, 2.75)');
    });

    it('emits negative numbers unquoted', async () => {
      const boxes = await SqlInBoxSource.generateBoxes('-1,-2', {
        sqlin: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('IN (-1, -2)');
    });
  });

  describe('mixed values', () => {
    it('quotes strings and leaves numbers bare in the same list', async () => {
      const boxes = await SqlInBoxSource.generateBoxes('a,2,b', {
        sqlin: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe("IN ('a', 2, 'b')");
    });
  });

  describe('single-quote escaping', () => {
    it("doubles embedded single quotes (O'Brien → O''Brien)", async () => {
      const boxes = await SqlInBoxSource.generateBoxes("O'Brien", {
        sqlin: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe("IN ('O''Brien')");
    });

    it('handles multiple quotes in one token', async () => {
      const boxes = await SqlInBoxSource.generateBoxes("it's a test", {
        sqlin: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe("IN ('it''s a test')");
    });
  });

  describe('splitting delimiters', () => {
    it('splits on commas', async () => {
      const boxes = await SqlInBoxSource.generateBoxes('a,b,c', {
        sqlin: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe("IN ('a', 'b', 'c')");
    });

    it('splits on newlines', async () => {
      const boxes = await SqlInBoxSource.generateBoxes('a\nb\nc', {
        sqlin: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe("IN ('a', 'b', 'c')");
    });

    it('handles mixed comma and newline delimiters', async () => {
      const boxes = await SqlInBoxSource.generateBoxes('a,b\nc', {
        sqlin: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe("IN ('a', 'b', 'c')");
    });

    it('collapses consecutive delimiters', async () => {
      const boxes = await SqlInBoxSource.generateBoxes('a,,\nb', {
        sqlin: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe("IN ('a', 'b')");
    });
  });

  describe('box metadata', () => {
    it('box name is "SQL IN Clause"', async () => {
      const boxes = await SqlInBoxSource.generateBoxes('x', { sqlin: true });
      expect(boxes[0].props.name).toBe('SQL IN Clause');
    });

    it('showExpandButton is false', async () => {
      const boxes = await SqlInBoxSource.generateBoxes('x', { sqlin: true });
      expect(boxes[0].props.showExpandButton).toBe(false);
    });

    it('priority matches source priority', async () => {
      const boxes = await SqlInBoxSource.generateBoxes('x', { sqlin: true });
      expect(boxes[0].props.priority).toBe(SqlInBoxSource.priority);
    });
  });

  describe('static metadata', () => {
    it('has expected properties', () => {
      expect(SqlInBoxSource.name).toBe('SQL IN Clause');
      expect(SqlInBoxSource.tag).toBe('#');
      expect(SqlInBoxSource.kind).toBe('Convert');
      expect(typeof SqlInBoxSource.priority).toBe('number');
    });
  });
});
