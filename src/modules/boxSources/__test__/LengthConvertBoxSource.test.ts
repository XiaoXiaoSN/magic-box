import { describe, expect, it } from 'vitest';
import { LengthConvertBoxSource } from '../LengthConvertBoxSource';

describe('LengthConvertBoxSource', () => {
  it('returns [] when no ::length option', async () => {
    const boxes = await LengthConvertBoxSource.generateBoxes('1 mi', null);
    expect(boxes).toHaveLength(0);
  });

  it('returns [] when unrelated option is given', async () => {
    const boxes = await LengthConvertBoxSource.generateBoxes('1 mi', {
      base64: true,
    });
    expect(boxes).toHaveLength(0);
  });

  describe('1 mi ::length', () => {
    it('produces one box with correct conversions', async () => {
      const boxes = await LengthConvertBoxSource.generateBoxes('1 mi', {
        length: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      // 1 mi = 1609.344 m exactly
      expect(opts.m).toBe('1609.344');
      // 1 mi = 1.609344 km exactly
      expect(opts.km).toBe('1.609344');
      // 1 mi = 5280 ft exactly
      expect(opts.ft).toBe('5280');
      // 1 mi = 1760 yd exactly
      expect(opts.yd).toBe('1760');
    });
  });

  describe('1000 m ::length', () => {
    it('converts to km=1 and mi≈0.621371', async () => {
      const boxes = await LengthConvertBoxSource.generateBoxes('1000 m', {
        length: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.km).toBe('1');
      // 1000 / 1609.344 ≈ 0.621371...
      expect(Number.parseFloat(opts.mi)).toBeCloseTo(0.621371, 5);
    });
  });

  describe('5 km ::length=mi', () => {
    it('includes a Result key with the target unit value', async () => {
      const boxes = await LengthConvertBoxSource.generateBoxes('5 km', {
        length: 'mi',
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Result).toContain('mi');
      // 5 km = 5000 m; 5000 / 1609.344 ≈ 3.10686
      expect(Number.parseFloat(opts.Result)).toBeCloseTo(3.10686, 4);
    });
  });

  describe('1 in ::length', () => {
    it('converts to cm=2.54', async () => {
      const boxes = await LengthConvertBoxSource.generateBoxes('1 in', {
        length: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.cm).toBe('2.54');
    });
  });

  describe('invalid inputs', () => {
    it('returns an error box for non-numeric input "abc"', async () => {
      const boxes = await LengthConvertBoxSource.generateBoxes('abc', {
        length: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Error).toBeTruthy();
      expect(opts['Supported Units']).toContain('mi');
    });

    it('returns an error box for unknown unit "5 furlong"', async () => {
      const boxes = await LengthConvertBoxSource.generateBoxes('5 furlong', {
        length: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Error).toMatch(/furlong/i);
      expect(opts['Supported Units']).toContain('km');
    });
  });

  describe('Input key is normalized', () => {
    it('includes Input key with parsed value and unit', async () => {
      const boxes = await LengthConvertBoxSource.generateBoxes('1 mi', {
        length: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Input).toBe('1 mi');
    });
  });
});
