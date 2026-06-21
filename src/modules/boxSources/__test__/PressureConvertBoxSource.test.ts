import { describe, expect, it } from 'vitest';

import { PressureConvertBoxSource } from '../PressureConvertBoxSource';

describe('PressureConvertBoxSource', () => {
  describe('generateBoxes', () => {
    it('should return [] when ::pressure option is absent', async () => {
      const boxes = await PressureConvertBoxSource.generateBoxes('1 atm', null);
      expect(boxes).toHaveLength(0);
    });

    it('should return [] when options is empty object (no pressure key)', async () => {
      const boxes = await PressureConvertBoxSource.generateBoxes('1 atm', {});
      expect(boxes).toHaveLength(0);
    });

    it('should convert 1 atm correctly', async () => {
      const boxes = await PressureConvertBoxSource.generateBoxes('1 atm', {
        pressure: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Pa).toBe('101325');
      expect(opts.kPa).toBe('101.325');
      expect(opts.bar).toBe('1.01325');
      // 101325 / 6894.757293168 ≈ 14.695949
      expect(opts.psi).toBe('14.695949');
      expect(opts.atm).toBe('1');
      // mmHg uses NIST factor 133.322387415 Pa — not exactly 101325/760, so ≈ 759.999892
      expect(opts.mmHg).toBe('759.999892');
      // Torr is defined as exactly 101325/760 Pa, so 1 atm = 760 Torr exactly
      expect(opts.Torr).toBe('760');
    });

    it('should convert 1 bar correctly', async () => {
      const boxes = await PressureConvertBoxSource.generateBoxes('1 bar', {
        pressure: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Pa).toBe('100000');
      expect(opts.kPa).toBe('100');
    });

    it('should convert 14.6959 psi close to 1 atm', async () => {
      const boxes = await PressureConvertBoxSource.generateBoxes(
        '14.6959 psi',
        {
          pressure: true,
        },
      );
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      // 14.6959 psi should yield atm ≈ 1 (within 0.01%)
      const atm = Number.parseFloat(opts.atm);
      expect(atm).toBeCloseTo(1, 3);
    });

    it('should convert 760 mmHg close to 1 atm', async () => {
      const boxes = await PressureConvertBoxSource.generateBoxes('760 mmHg', {
        pressure: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.atm).toBe('1');
    });

    it('should handle uppercase unit (ATM)', async () => {
      const boxes = await PressureConvertBoxSource.generateBoxes('1 ATM', {
        pressure: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Pa).toBe('101325');
    });

    it('should return an error box for completely invalid input', async () => {
      const boxes = await PressureConvertBoxSource.generateBoxes('abc', {
        pressure: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Supported units']).toBeDefined();
    });

    it('should return an error box for unknown unit', async () => {
      const boxes = await PressureConvertBoxSource.generateBoxes('5 foo', {
        pressure: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Supported units']).toBeDefined();
    });

    it('should include Input field in successful conversion', async () => {
      const boxes = await PressureConvertBoxSource.generateBoxes('1 atm', {
        pressure: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Input).toBe('1 atm');
    });

    it('should set KeyValueBoxTemplate on the box', async () => {
      const boxes = await PressureConvertBoxSource.generateBoxes('1 atm', {
        pressure: true,
      });
      expect(boxes[0].boxTemplate).toBeDefined();
    });
  });
});
