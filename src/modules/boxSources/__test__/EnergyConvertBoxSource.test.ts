import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { EnergyConvertBoxSource } from '../EnergyConvertBoxSource';

describe('EnergyConvertBoxSource', () => {
  describe('generateBoxes — no option key', () => {
    it('returns [] when no options are provided', async () => {
      const boxes = await EnergyConvertBoxSource.generateBoxes('1 kWh', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when ::energy option is absent', async () => {
      const boxes = await EnergyConvertBoxSource.generateBoxes('1 kWh', {
        other: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes — 1 kWh', () => {
    it('produces one box with correct energy conversions', async () => {
      const boxes = await EnergyConvertBoxSource.generateBoxes('1 kWh', {
        energy: true,
      });
      expect(boxes).toHaveLength(1);

      const { options } = boxes[0].props;
      expect(options).not.toBeNull();
      const kv = options as Record<string, string>;

      expect(kv.Input).toBe('1 kWh');
      // 1 kWh = 3 600 000 J exactly
      expect(kv.J).toBe('3600000');
      // 1 kWh = 3 600 kJ exactly
      expect(kv.kJ).toBe('3600');
      // 1 kWh = 1 000 Wh exactly
      expect(kv.Wh).toBe('1000');
      // 1 kWh = 3 600 000 / 4 184 kcal ≈ 860.420650
      expect(Number.parseFloat(kv.kcal)).toBeCloseTo(860.42065, 3);
    });

    it('uses KeyValueBoxTemplate', async () => {
      const boxes = await EnergyConvertBoxSource.generateBoxes('1 kWh', {
        energy: true,
      });
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
    });

    it('sets priority to 10', async () => {
      const boxes = await EnergyConvertBoxSource.generateBoxes('1 kWh', {
        energy: true,
      });
      expect(boxes[0].props.priority).toBe(10);
    });
  });

  describe('generateBoxes — 1 cal', () => {
    it('converts 1 cal to J = 4.184', async () => {
      const boxes = await EnergyConvertBoxSource.generateBoxes('1 cal', {
        energy: true,
      });
      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv.J).toBe('4.184');
    });
  });

  describe('generateBoxes — 1000 cal', () => {
    it('converts 1000 cal to exactly 1 kcal', async () => {
      const boxes = await EnergyConvertBoxSource.generateBoxes('1000 cal', {
        energy: true,
      });
      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv.kcal).toBe('1');
    });
  });

  describe('generateBoxes — 1 BTU', () => {
    it('converts 1 BTU to J ≈ 1055.055853', async () => {
      const boxes = await EnergyConvertBoxSource.generateBoxes('1 BTU', {
        energy: true,
      });
      const kv = boxes[0].props.options as Record<string, string>;
      expect(Number.parseFloat(kv.J)).toBeCloseTo(1055.05585262, 5);
    });
  });

  describe('generateBoxes — eV exponential notation', () => {
    it('1 J → eV is ~6.241509e18 and uses exponential notation', async () => {
      const boxes = await EnergyConvertBoxSource.generateBoxes('1 J', {
        energy: true,
      });
      const kv = boxes[0].props.options as Record<string, string>;
      // value must be in exponential notation (contains 'e' or 'E')
      expect(kv.eV).toMatch(/e/i);
      // numeric value should be close to 1/1.602176634e-19
      expect(Number.parseFloat(kv.eV)).toBeCloseTo(6.241509e18, 10);
    });
  });

  describe('generateBoxes — invalid input', () => {
    it('returns an error box for bare text "abc"', async () => {
      const boxes = await EnergyConvertBoxSource.generateBoxes('abc', {
        energy: true,
      });
      expect(boxes).toHaveLength(1);
      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv['Supported units']).toBeTruthy();
    });

    it('returns an error box for unknown unit "5 foo"', async () => {
      const boxes = await EnergyConvertBoxSource.generateBoxes('5 foo', {
        energy: true,
      });
      expect(boxes).toHaveLength(1);
      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv['Supported units']).toBeTruthy();
      expect(kv.Error).toMatch(/foo/i);
    });
  });
});
