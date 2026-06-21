import { describe, expect, it } from 'vitest';

import { RegexEscapeBoxSource } from '../RegexEscapeBoxSource';

describe('RegexEscapeBoxSource', () => {
  describe('generateBoxes - gating', () => {
    it('returns [] when no option is provided', async () => {
      const boxes = await RegexEscapeBoxSource.generateBoxes('a.b*c', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for empty options object', async () => {
      const boxes = await RegexEscapeBoxSource.generateBoxes('a.b*c', {});
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for empty input string', async () => {
      const boxes = await RegexEscapeBoxSource.generateBoxes('', {
        regexescape: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes - escaping', () => {
    it('escapes . and * in "a.b*c"', async () => {
      const boxes = await RegexEscapeBoxSource.generateBoxes('a.b*c', {
        regexescape: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('a\\.b\\*c');
    });

    it('escapes ( ? ) in "(x?)"', async () => {
      const boxes = await RegexEscapeBoxSource.generateBoxes('(x?)', {
        regexescape: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('\\(x\\?\\)');
    });

    it('escapes + but leaves = unchanged in "1+1=2"', async () => {
      const boxes = await RegexEscapeBoxSource.generateBoxes('1+1=2', {
        regexescape: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('1\\+1=2');
    });

    it('escapes $ and . in "price: $5.00"', async () => {
      const boxes = await RegexEscapeBoxSource.generateBoxes('price: $5.00', {
        regexescape: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('price: \\$5\\.00');
    });

    it('escapes backslash in "a\\b"', async () => {
      // input is a-backslash-b (2 chars between a and b)
      const boxes = await RegexEscapeBoxSource.generateBoxes('a\\b', {
        regexescape: true,
      });
      expect(boxes).toHaveLength(1);
      // output: a\\b (escaped backslash)
      expect(boxes[0].props.plaintextOutput).toBe('a\\\\b');
    });

    it('leaves plain text unchanged when no special chars', async () => {
      const boxes = await RegexEscapeBoxSource.generateBoxes('hello', {
        regexescape: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('hello');
    });
  });

  describe('generateBoxes - alias trigger', () => {
    it('accepts ::reescape as an alias', async () => {
      const boxes = await RegexEscapeBoxSource.generateBoxes('a.b', {
        reescape: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('a\\.b');
    });
  });

  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(RegexEscapeBoxSource.name).toBe('Regex Escape');
      expect(RegexEscapeBoxSource.tag).toBe('#');
      expect(RegexEscapeBoxSource.kind).toBe('Encode');
      expect(typeof RegexEscapeBoxSource.priority).toBe('number');
    });
  });
});
