import { describe, expect, it } from 'vitest';

import { PowerConvertBoxSource } from '../PowerConvertBoxSource';

describe('PowerConvertBoxSource', () => {
  describe('generateBoxes', () => {
    it('should return empty array when ::power option is absent', async () => {
      const boxes = await PowerConvertBoxSource.generateBoxes('100 hp', null);
      expect(boxes).toHaveLength(0);
    });

    it('should return empty array when options object has no power key', async () => {
      const boxes = await PowerConvertBoxSource.generateBoxes('100 hp', {});
      expect(boxes).toHaveLength(0);
    });

    it('should convert 1 hp to correct watt value', async () => {
      const boxes = await PowerConvertBoxSource.generateBoxes('1 hp', {
        power: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      // 1 mechanical hp = 745.6998715822702 W → rounded to 6 dp → 745.699872
      expect(opts.W).toBe('745.699872');
      expect(opts.kW).toBe('0.7457');
    });

    it('should convert 1000 W to exactly 1 kW', async () => {
      const boxes = await PowerConvertBoxSource.generateBoxes('1000 W', {
        power: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.kW).toBe('1');
    });

    it('should convert 1 kW to correct hp value', async () => {
      const boxes = await PowerConvertBoxSource.generateBoxes('1 kW', {
        power: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      // 1000 / 745.6998715822702 = 1.341022...
      expect(opts.hp).toBe('1.341022');
    });

    it('should convert 1 PS to correct watt value', async () => {
      const boxes = await PowerConvertBoxSource.generateBoxes('1 PS', {
        power: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      // 1 PS = 735.49875 W (exact)
      expect(opts.W).toBe('735.49875');
    });

    it('should include Input key in options', async () => {
      const boxes = await PowerConvertBoxSource.generateBoxes('1 hp', {
        power: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Input).toBe('1 hp');
    });

    it('should return a box with supported units for fully invalid input', async () => {
      const boxes = await PowerConvertBoxSource.generateBoxes('abc', {
        power: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Supported units']).toContain('W');
      expect(opts['Supported units']).toContain('hp');
    });

    it('should return a box with supported units for unknown unit', async () => {
      const boxes = await PowerConvertBoxSource.generateBoxes('5 foo', {
        power: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Supported units']).toContain('W');
      expect(opts['Supported units']).toContain('PS');
    });

    it('should produce a non-empty plaintextOutput', async () => {
      const boxes = await PowerConvertBoxSource.generateBoxes('1 hp', {
        power: true,
      });
      expect(boxes[0].props.plaintextOutput).toContain('W: 745.699872');
    });
  });
});
