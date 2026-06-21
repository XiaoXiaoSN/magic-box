import { describe, expect, it } from 'vitest';

import { CsvToMarkdownBoxSource } from '../CsvToMarkdownBoxSource';

describe('CsvToMarkdownBoxSource', () => {
  describe('generateBoxes', () => {
    it('returns empty array when no option key present', async () => {
      const boxes =
        await CsvToMarkdownBoxSource.generateBoxes('name,age\nAlice,30');
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array when option does not match', async () => {
      const boxes = await CsvToMarkdownBoxSource.generateBoxes(
        'name,age\nAlice,30',
        { other: true },
      );
      expect(boxes).toHaveLength(0);
    });

    it('converts basic csv to markdown table with ::csvmd', async () => {
      const boxes = await CsvToMarkdownBoxSource.generateBoxes(
        'name,age\nAlice,30\nBob,25',
        { csvmd: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe(
        '| name | age |\n| --- | --- |\n| Alice | 30 |\n| Bob | 25 |',
      );
    });

    it('converts basic csv to markdown table with ::csv2md', async () => {
      const boxes = await CsvToMarkdownBoxSource.generateBoxes(
        'name,age\nAlice,30',
        { csv2md: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe(
        '| name | age |\n| --- | --- |\n| Alice | 30 |',
      );
    });

    it('handles quoted field with embedded comma', async () => {
      const boxes = await CsvToMarkdownBoxSource.generateBoxes('a,b\n"x,y",2', {
        csvmd: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe(
        '| a | b |\n| --- | --- |\n| x,y | 2 |',
      );
    });

    it('escapes pipe characters in cells', async () => {
      const boxes = await CsvToMarkdownBoxSource.generateBoxes('a\nx|y', {
        csvmd: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('| a |\n| --- |\n| x\\|y |');
    });

    it('pads ragged short data rows to header width', async () => {
      const boxes = await CsvToMarkdownBoxSource.generateBoxes('a,b\n1', {
        csvmd: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe(
        '| a | b |\n| --- | --- |\n| 1 |  |',
      );
    });

    it('returns a box mentioning no rows for empty input', async () => {
      const boxes = await CsvToMarkdownBoxSource.generateBoxes('', {
        csvmd: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/no csv rows found/i);
    });

    it('sets priority correctly', async () => {
      const boxes = await CsvToMarkdownBoxSource.generateBoxes('a\n1', {
        csvmd: true,
      });
      expect(boxes[0].props.priority).toBe(10);
    });

    it('sets language option to markdown', async () => {
      const boxes = await CsvToMarkdownBoxSource.generateBoxes('a\n1', {
        csvmd: true,
      });
      expect(boxes[0].props.options).toEqual({ language: 'markdown' });
    });

    it('handles quoted field with embedded double-quote escape', async () => {
      const boxes = await CsvToMarkdownBoxSource.generateBoxes(
        'a\n"say ""hi"""',
        { csvmd: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe(
        '| a |\n| --- |\n| say "hi" |',
      );
    });

    it('clamps data rows wider than header to header width', async () => {
      const boxes = await CsvToMarkdownBoxSource.generateBoxes('a,b\n1,2,3', {
        csvmd: true,
      });
      expect(boxes).toHaveLength(1);
      // clamp: only first 2 cells emitted
      expect(boxes[0].props.plaintextOutput).toBe(
        '| a | b |\n| --- | --- |\n| 1 | 2 |',
      );
    });
  });
});
