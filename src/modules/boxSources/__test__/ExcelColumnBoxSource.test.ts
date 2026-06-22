import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { ExcelColumnBoxSource } from '../ExcelColumnBoxSource';

describe('ExcelColumnBoxSource', () => {
  describe('no option → empty array', () => {
    it('returns [] when options is null', async () => {
      const boxes = await ExcelColumnBoxSource.generateBoxes('AB', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when no matching option key is present', async () => {
      const boxes = await ExcelColumnBoxSource.generateBoxes('AB', {
        json: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('letters → number (bijective base-26)', () => {
    it('A → 1', async () => {
      const boxes = await ExcelColumnBoxSource.generateBoxes('A', {
        excelcol: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.Number).toBe('1');
      expect(boxes[0].props.options?.Column).toBe('A');
    });

    it('Z → 26', async () => {
      const boxes = await ExcelColumnBoxSource.generateBoxes('Z', {
        excelcol: true,
      });
      expect(boxes[0].props.options?.Number).toBe('26');
    });

    // AB = 1*26 + 2 = 28
    it('AB → 28', async () => {
      const boxes = await ExcelColumnBoxSource.generateBoxes('AB', {
        excelcol: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.Number).toBe('28');
      expect(boxes[0].props.options?.Column).toBe('AB');
    });

    // AA = 1*26 + 1 = 27
    it('AA → 27', async () => {
      const boxes = await ExcelColumnBoxSource.generateBoxes('AA', {
        excelcol: true,
      });
      expect(boxes[0].props.options?.Number).toBe('27');
    });

    // ZZ = 26*26 + 26 = 702
    it('ZZ → 702', async () => {
      const boxes = await ExcelColumnBoxSource.generateBoxes('ZZ', {
        excelcol: true,
      });
      expect(boxes[0].props.options?.Number).toBe('702');
    });

    // AAA = 26^2 + 26 + 1 = 703
    it('AAA → 703', async () => {
      const boxes = await ExcelColumnBoxSource.generateBoxes('AAA', {
        excelcol: true,
      });
      expect(boxes[0].props.options?.Number).toBe('703');
    });

    // Excel's last column XFD → 16384
    it('XFD → 16384 (Excel max column)', async () => {
      const boxes = await ExcelColumnBoxSource.generateBoxes('XFD', {
        excelcol: true,
      });
      expect(boxes[0].props.options?.Number).toBe('16384');
    });

    it('lowercase ab is treated case-insensitively → 28', async () => {
      const boxes = await ExcelColumnBoxSource.generateBoxes('ab', {
        excelcol: true,
      });
      expect(boxes[0].props.options?.Number).toBe('28');
      // column is always uppercased in output
      expect(boxes[0].props.options?.Column).toBe('AB');
    });
  });

  describe('number → letters (reverse lookup)', () => {
    it('28 → AB', async () => {
      const boxes = await ExcelColumnBoxSource.generateBoxes('28', {
        excelcol: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.Column).toBe('AB');
      expect(boxes[0].props.options?.Number).toBe('28');
    });

    it('1 → A', async () => {
      const boxes = await ExcelColumnBoxSource.generateBoxes('1', {
        excelcol: true,
      });
      expect(boxes[0].props.options?.Column).toBe('A');
    });

    it('27 → AA', async () => {
      const boxes = await ExcelColumnBoxSource.generateBoxes('27', {
        excelcol: true,
      });
      expect(boxes[0].props.options?.Column).toBe('AA');
    });

    it('702 → ZZ', async () => {
      const boxes = await ExcelColumnBoxSource.generateBoxes('702', {
        excelcol: true,
      });
      expect(boxes[0].props.options?.Column).toBe('ZZ');
    });

    it('16384 → XFD', async () => {
      const boxes = await ExcelColumnBoxSource.generateBoxes('16384', {
        excelcol: true,
      });
      expect(boxes[0].props.options?.Column).toBe('XFD');
    });
  });

  describe('round-trip AB → 28 → AB', () => {
    it('letters→number→letters stays consistent', async () => {
      const fwd = await ExcelColumnBoxSource.generateBoxes('AB', {
        excelcol: true,
      });
      const num = fwd[0].props.options?.Number as string;
      const rev = await ExcelColumnBoxSource.generateBoxes(num, {
        excelcol: true,
      });
      expect(rev[0].props.options?.Column).toBe('AB');
    });
  });

  describe('alternate option key ::spreadsheetcol', () => {
    it('accepts spreadsheetcol option', async () => {
      const boxes = await ExcelColumnBoxSource.generateBoxes('AB', {
        spreadsheetcol: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.Number).toBe('28');
    });
  });

  describe('invalid / mixed inputs → explanatory box', () => {
    it('A1 (mixed) returns explanatory box, not empty', async () => {
      const boxes = await ExcelColumnBoxSource.generateBoxes('A1', {
        excelcol: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/enter column/i);
    });

    it('"hello world" (space) returns explanatory box', async () => {
      const boxes = await ExcelColumnBoxSource.generateBoxes('hello world', {
        excelcol: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/enter column/i);
    });

    it('0 returns out-of-range box', async () => {
      const boxes = await ExcelColumnBoxSource.generateBoxes('0', {
        excelcol: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.Number).toBe('out of range');
    });
  });

  describe('box metadata', () => {
    it('uses KeyValueBoxTemplate', async () => {
      const boxes = await ExcelColumnBoxSource.generateBoxes('AB', {
        excelcol: true,
      });
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
    });

    it('box name is Spreadsheet Column', async () => {
      const boxes = await ExcelColumnBoxSource.generateBoxes('AB', {
        excelcol: true,
      });
      expect(boxes[0].props.name).toBe('Spreadsheet Column');
    });

    it('priority is set', async () => {
      const boxes = await ExcelColumnBoxSource.generateBoxes('AB', {
        excelcol: true,
      });
      expect(boxes[0].props.priority).toBe(10);
    });

    it('source metadata', () => {
      expect(ExcelColumnBoxSource.name).toBe('Spreadsheet Column');
      expect(ExcelColumnBoxSource.tag).toBe('#');
      expect(ExcelColumnBoxSource.kind).toBe('Convert');
      expect(ExcelColumnBoxSource.priority).toBe(10);
    });
  });
});
