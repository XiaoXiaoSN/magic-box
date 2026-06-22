import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { AreaConvertBoxSource } from '../AreaConvertBoxSource';

describe('AreaConvertBoxSource', () => {
  describe('option gate', () => {
    it('returns [] when no options are provided', async () => {
      const boxes = await AreaConvertBoxSource.generateBoxes('1 acre', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when an unrelated option is provided', async () => {
      const boxes = await AreaConvertBoxSource.generateBoxes('1 acre', {
        base64: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('1 acre conversions', () => {
    it('converts 1 acre to m², ft², and hectare correctly', async () => {
      const boxes = await AreaConvertBoxSource.generateBoxes('1 acre', {
        area: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Area Convert');
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
      expect(boxes[0].props.priority).toBe(10);

      const opts = boxes[0].props.options as Record<string, string>;
      // 1 acre = 4046.8564224 m² → 6dp → 4046.856422
      expect(opts['m²']).toBe('4046.856422');
      // 1 acre = 43560 ft² exactly
      expect(opts['ft²']).toBe('43560');
      // 1 acre ≈ 0.404686 hectare
      expect(opts.hectare).toBe('0.404686');
    });
  });

  describe('1 hectare conversions', () => {
    it('converts 1 hectare to m² and acre correctly', async () => {
      const boxes = await AreaConvertBoxSource.generateBoxes('1 hectare', {
        area: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      // 1 hectare = exactly 10000 m²
      expect(opts['m²']).toBe('10000');
      // 1 hectare ≈ 2.471054 acres
      expect(opts.acre).toBe('2.471054');
    });
  });

  describe('1 km2 conversions', () => {
    it('converts 1 km2 to m² and hectare correctly', async () => {
      const boxes = await AreaConvertBoxSource.generateBoxes('1 km2', {
        area: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['m²']).toBe('1000000');
      expect(opts.hectare).toBe('100');
    });
  });

  describe('unit notation variants', () => {
    it('accepts m^2 notation', async () => {
      const boxes = await AreaConvertBoxSource.generateBoxes('5 m^2', {
        area: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['m²']).toBe('5');
    });

    it('accepts m² superscript notation', async () => {
      const boxes = await AreaConvertBoxSource.generateBoxes('5 m²', {
        area: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['m²']).toBe('5');
    });
  });

  describe('1 mi2 conversions', () => {
    it('converts 1 mi2 to exactly 640 acres', async () => {
      const boxes = await AreaConvertBoxSource.generateBoxes('1 mi2', {
        area: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      // 1 square mile = exactly 640 acres
      expect(opts.acre).toBe('640');
    });
  });

  describe('invalid input', () => {
    it('returns an error box for unparseable input', async () => {
      const boxes = await AreaConvertBoxSource.generateBoxes('abc', {
        area: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Supported units']).toBeDefined();
      expect(opts['Supported units']).toContain('acre');
    });

    it('returns an error box for unknown unit', async () => {
      const boxes = await AreaConvertBoxSource.generateBoxes('5 foo', {
        area: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Supported units']).toBeDefined();
      expect(opts['Supported units']).toContain('acre');
    });
  });
});
