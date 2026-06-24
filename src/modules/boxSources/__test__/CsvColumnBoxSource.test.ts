import { describe, expect, it } from 'vitest';

import { CsvColumnBoxSource } from '../CsvColumnBoxSource';

const CSV = 'name,email\nAlice,a@x.com\nBob,b@y.com';

describe('CsvColumnBoxSource', () => {
  describe('trigger guard', () => {
    it('returns [] when no option is provided', async () => {
      const boxes = await CsvColumnBoxSource.generateBoxes(CSV, null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for empty options object', async () => {
      const boxes = await CsvColumnBoxSource.generateBoxes(CSV, {});
      expect(boxes).toHaveLength(0);
    });
  });

  describe('column selection by header name', () => {
    it('extracts the email column by name', async () => {
      const boxes = await CsvColumnBoxSource.generateBoxes(CSV, {
        csvcol: 'email',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('a@x.com\nb@y.com');
    });

    it('extracts the name column by name', async () => {
      const boxes = await CsvColumnBoxSource.generateBoxes(CSV, {
        csvcol: 'name',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('Alice\nBob');
    });
  });

  describe('column selection by index', () => {
    it('extracts column 0 by index', async () => {
      const boxes = await CsvColumnBoxSource.generateBoxes(CSV, {
        csvcol: '0',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('Alice\nBob');
    });

    it('extracts column 1 by index', async () => {
      const boxes = await CsvColumnBoxSource.generateBoxes(CSV, {
        csvcol: '1',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('a@x.com\nb@y.com');
    });
  });

  describe('quoted fields', () => {
    it('handles a field with an embedded comma inside quotes', async () => {
      const input = 'a,b\n"x,y",2';
      const boxes = await CsvColumnBoxSource.generateBoxes(input, {
        csvcol: '0',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('x,y');
    });

    it('unescapes "" inside quoted fields', async () => {
      const input = 'a,b\n"say ""hi""",2';
      const boxes = await CsvColumnBoxSource.generateBoxes(input, {
        csvcol: '0',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('say "hi"');
    });
  });

  describe('error cases', () => {
    it('returns an error box when header is not found', async () => {
      const boxes = await CsvColumnBoxSource.generateBoxes(CSV, {
        csvcol: 'zzz',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/not found/i);
    });

    it('returns an error box for an out-of-range index', async () => {
      const boxes = await CsvColumnBoxSource.generateBoxes(CSV, {
        csvcol: '5',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/not found/i);
    });

    it('returns an informational box when csvcol has no value (bare flag)', async () => {
      const boxes = await CsvColumnBoxSource.generateBoxes(CSV, {
        csvcol: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/required/i);
    });
  });

  describe('alternate trigger key', () => {
    it('accepts ::csvcolumn as an alias', async () => {
      const boxes = await CsvColumnBoxSource.generateBoxes(CSV, {
        csvcolumn: 'email',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('a@x.com\nb@y.com');
    });
  });

  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(CsvColumnBoxSource.name).toBe('CSV Column');
      expect(CsvColumnBoxSource.tag).toBe('#');
      expect(CsvColumnBoxSource.kind).toBe('Analyze');
      expect(typeof CsvColumnBoxSource.priority).toBe('number');
    });
  });
});
