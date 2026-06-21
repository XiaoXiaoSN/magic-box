import { describe, expect, it } from 'vitest';

import { AngleConvertBoxSource } from '../AngleConvertBoxSource';

describe('AngleConvertBoxSource', () => {
  describe('generateBoxes', () => {
    it('should return empty array when ::angle option is not present', async () => {
      const boxes = await AngleConvertBoxSource.generateBoxes('180 deg', null);
      expect(boxes).toHaveLength(0);
    });

    it('should return empty array when options object has no angle key', async () => {
      const boxes = await AngleConvertBoxSource.generateBoxes('180 deg', {
        foo: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('should convert 180 deg → π rad, 200 grad, 0.5 turn', async () => {
      const boxes = await AngleConvertBoxSource.generateBoxes('180 deg', {
        angle: true,
      });

      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Degrees).toBe('180');
      expect(opts.Radians).toBe('3.141593');
      expect(opts.Gradians).toBe('200');
      expect(opts.Turns).toBe('0.5');
    });

    it('should convert 1 turn → 360 deg, ~6.283185 rad, 400 grad', async () => {
      const boxes = await AngleConvertBoxSource.generateBoxes('1 turn', {
        angle: true,
      });

      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Degrees).toBe('360');
      expect(opts.Radians).toBe('6.283185');
      expect(opts.Gradians).toBe('400');
      expect(opts.Turns).toBe('1');
    });

    it('should convert 100 grad → 90 deg', async () => {
      const boxes = await AngleConvertBoxSource.generateBoxes('100 grad', {
        angle: true,
      });

      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Degrees).toBe('90');
    });

    it('should convert 1.5708 rad → ~90 deg', async () => {
      const boxes = await AngleConvertBoxSource.generateBoxes('1.5708 rad', {
        angle: true,
      });

      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      // 1.5708 rad is approximately 90 degrees (within floating-point tolerance)
      expect(Number.parseFloat(opts.Degrees)).toBeCloseTo(90, 3);
    });

    it('should handle the ° symbol: 90° → ~1.570796 rad', async () => {
      const boxes = await AngleConvertBoxSource.generateBoxes('90°', {
        angle: true,
      });

      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Degrees).toBe('90');
      expect(opts.Radians).toBe('1.570796');
    });

    it('should return an error box for non-numeric input "abc"', async () => {
      const boxes = await AngleConvertBoxSource.generateBoxes('abc', {
        angle: true,
      });

      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      // error box must mention valid units
      expect(opts.Units).toBeDefined();
      expect(opts.Units.length).toBeGreaterThan(0);
    });

    it('should return an error box for unrecognized unit "5 parsecs"', async () => {
      const boxes = await AngleConvertBoxSource.generateBoxes('5 parsecs', {
        angle: true,
      });

      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Units).toBeDefined();
      expect(opts.Units.length).toBeGreaterThan(0);
    });

    it('should accept unit alias "degrees"', async () => {
      const boxes = await AngleConvertBoxSource.generateBoxes('360 degrees', {
        angle: true,
      });

      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Degrees).toBe('360');
      expect(opts.Turns).toBe('1');
    });

    it('should accept unit alias "radians"', async () => {
      const boxes = await AngleConvertBoxSource.generateBoxes('1 radians', {
        angle: true,
      });

      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(Number.parseFloat(opts.Degrees)).toBeCloseTo(57.29578, 3);
    });

    it('should handle negative angles', async () => {
      const boxes = await AngleConvertBoxSource.generateBoxes('-90 deg', {
        angle: true,
      });

      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Degrees).toBe('-90');
      expect(opts.Turns).toBe('-0.25');
    });

    it('should set box name to "Angle Convert"', async () => {
      const boxes = await AngleConvertBoxSource.generateBoxes('180 deg', {
        angle: true,
      });

      expect(boxes[0].props.name).toBe('Angle Convert');
    });

    it('should set priority to the module priority', async () => {
      const boxes = await AngleConvertBoxSource.generateBoxes('180 deg', {
        angle: true,
      });

      expect(boxes[0].props.priority).toBe(AngleConvertBoxSource.priority);
    });
  });
});
