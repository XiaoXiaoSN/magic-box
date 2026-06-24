import { CodeBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { LineNumbersBoxSource } from '../LineNumbersBoxSource';

describe('LineNumbersBoxSource', () => {
  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(LineNumbersBoxSource.name).toBe('Line Numbers');
      expect(LineNumbersBoxSource.tag).toBe('#');
      expect(LineNumbersBoxSource.kind).toBe('Transform');
      expect(typeof LineNumbersBoxSource.priority).toBe('number');
    });
  });

  describe('generateBoxes - guard conditions', () => {
    it('returns empty array when no option is provided', async () => {
      const boxes = await LineNumbersBoxSource.generateBoxes(
        'first\nsecond\nthird',
        null,
      );
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty options object', async () => {
      const boxes = await LineNumbersBoxSource.generateBoxes(
        'first\nsecond\nthird',
        {},
      );
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty input string with ::linenumbers', async () => {
      const boxes = await LineNumbersBoxSource.generateBoxes('', {
        linenumbers: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for input exceeding MAX_INPUT', async () => {
      const huge = 'a'.repeat(100_001);
      const boxes = await LineNumbersBoxSource.generateBoxes(huge, {
        linenumbers: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes - add line numbers (::linenumbers)', () => {
    it('numbers three lines starting at 1 with width 1', async () => {
      const boxes = await LineNumbersBoxSource.generateBoxes(
        'first\nsecond\nthird',
        { linenumbers: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe(
        '1 | first\n2 | second\n3 | third',
      );
    });

    it('uses CodeBoxTemplate', async () => {
      const boxes = await LineNumbersBoxSource.generateBoxes('hello', {
        linenumbers: true,
      });
      expect(boxes[0].boxTemplate).toBe(CodeBoxTemplate);
    });

    it('sets box name to "Line Numbers"', async () => {
      const boxes = await LineNumbersBoxSource.generateBoxes('hello', {
        linenumbers: true,
      });
      expect(boxes[0].props.name).toBe('Line Numbers');
    });

    it('sets priority from the source', async () => {
      const boxes = await LineNumbersBoxSource.generateBoxes('hello', {
        linenumbers: true,
      });
      expect(boxes[0].props.priority).toBe(LineNumbersBoxSource.priority);
    });

    it('accepts ::numberlines as alias for ::linenumbers', async () => {
      const boxes = await LineNumbersBoxSource.generateBoxes(
        'first\nsecond\nthird',
        { numberlines: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe(
        '1 | first\n2 | second\n3 | third',
      );
    });

    it('supports custom start index via ::linenumbers=10', async () => {
      const boxes = await LineNumbersBoxSource.generateBoxes(
        'first\nsecond\nthird',
        { linenumbers: '10' },
      );
      expect(boxes[0].props.plaintextOutput).toBe(
        '10 | first\n11 | second\n12 | third',
      );
    });

    it('right-aligns with space padding when max width is 2 (10 lines from 1)', async () => {
      const input = Array.from({ length: 10 }, (_, i) =>
        String.fromCharCode(97 + i),
      ).join('\n');
      const boxes = await LineNumbersBoxSource.generateBoxes(input, {
        linenumbers: true,
      });
      const lines = boxes[0].props.plaintextOutput.split('\n');
      // line 1 should be ' 1 | a' (leading space, width 2)
      expect(lines[0]).toBe(' 1 | a');
      // line 10 should be '10 | j' (no leading space)
      expect(lines[9]).toBe('10 | j');
    });

    it('strips trailing \\r from each line before numbering', async () => {
      const boxes = await LineNumbersBoxSource.generateBoxes(
        'first\r\nsecond\r\nthird',
        { linenumbers: true },
      );
      expect(boxes[0].props.plaintextOutput).toBe(
        '1 | first\n2 | second\n3 | third',
      );
    });

    it('falls back to start=1 when ::linenumbers value is not a valid integer', async () => {
      const boxes = await LineNumbersBoxSource.generateBoxes('a\nb', {
        linenumbers: 'abc',
      });
      expect(boxes[0].props.plaintextOutput).toBe('1 | a\n2 | b');
    });

    it('falls back to start=1 when ::linenumbers is boolean true', async () => {
      const boxes = await LineNumbersBoxSource.generateBoxes('a\nb', {
        linenumbers: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('1 | a\n2 | b');
    });
  });

  describe('generateBoxes - strip line numbers (::stripnumbers)', () => {
    it('strips leading "N | " prefix from each line', async () => {
      const boxes = await LineNumbersBoxSource.generateBoxes(
        '1 | first\n2 | second',
        { stripnumbers: true },
      );
      expect(boxes[0].props.plaintextOutput).toBe('first\nsecond');
    });

    it('strips wide number prefix with space-padded numbers', async () => {
      const boxes = await LineNumbersBoxSource.generateBoxes(
        ' 1 | first\n 2 | second\n10 | tenth',
        { stripnumbers: true },
      );
      expect(boxes[0].props.plaintextOutput).toBe('first\nsecond\ntenth');
    });

    it('round-trips add then strip back to original', async () => {
      const original = 'alpha\nbeta\ngamma';
      const numbered = await LineNumbersBoxSource.generateBoxes(original, {
        linenumbers: true,
      });
      const stripped = await LineNumbersBoxSource.generateBoxes(
        numbered[0].props.plaintextOutput,
        { stripnumbers: true },
      );
      expect(stripped[0].props.plaintextOutput).toBe(original);
    });
  });
});
