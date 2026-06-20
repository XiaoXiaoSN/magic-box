import { describe, expect, it } from 'vitest';

import { RegexEscapeBoxSource } from '../RegexEscapeBoxSource';

describe('RegexEscapeBoxSource', () => {
  describe('generateBoxes', () => {
    it('should return [] when no option is provided', async () => {
      const boxes = await RegexEscapeBoxSource.generateBoxes('a.b*c(d)');
      expect(boxes).toHaveLength(0);
    });

    it('should return [] for empty input even with option', async () => {
      const boxes = await RegexEscapeBoxSource.generateBoxes('', {
        regexescape: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('should escape metacharacters with ::regexescape', async () => {
      const boxes = await RegexEscapeBoxSource.generateBoxes('a.b*c(d)', {
        regexescape: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('a\\.b\\*c\\(d\\)');
    });

    it('should also trigger on ::reescape alias', async () => {
      const boxes = await RegexEscapeBoxSource.generateBoxes('a.b*c(d)', {
        reescape: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('a\\.b\\*c\\(d\\)');
    });

    it('should escape + and = in "1+1=2"', async () => {
      const boxes = await RegexEscapeBoxSource.generateBoxes('1+1=2', {
        regexescape: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('1\\+1=2');
    });

    it('should escape $ and . in "price: $5.00"', async () => {
      const boxes = await RegexEscapeBoxSource.generateBoxes('price: $5.00', {
        regexescape: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('price: \\$5\\.00');
    });

    it('should leave a plain word unchanged', async () => {
      const boxes = await RegexEscapeBoxSource.generateBoxes('hello', {
        regexescape: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('hello');
    });

    it('escaped output used in RegExp should match the original string literally', async () => {
      const original = 'a.b*c(d)';
      const boxes = await RegexEscapeBoxSource.generateBoxes(original, {
        regexescape: true,
      });
      expect(boxes).toHaveLength(1);
      const escaped = boxes[0].props.plaintextOutput as string;
      expect(new RegExp(escaped).test(original)).toBe(true);
    });

    it('should produce a box named "Regex Escape"', async () => {
      const boxes = await RegexEscapeBoxSource.generateBoxes('hello', {
        regexescape: true,
      });
      expect(boxes[0].props.name).toBe('Regex Escape');
    });

    it('should set priority to 10', async () => {
      const boxes = await RegexEscapeBoxSource.generateBoxes('hello', {
        regexescape: true,
      });
      expect(boxes[0].props.priority).toBe(10);
    });
  });
});
