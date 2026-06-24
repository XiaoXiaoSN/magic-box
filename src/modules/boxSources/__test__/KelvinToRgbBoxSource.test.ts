import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { KelvinToRgbBoxSource } from '../KelvinToRgbBoxSource';

// Tanner Helland formula replicated to compute expected channel values in tests
function clamp(v: number): number {
  return Math.round(Math.min(255, Math.max(0, v)));
}

function kelvinToRgb(kelvin: number): { r: number; g: number; b: number } {
  const temp = kelvin / 100;

  const r =
    temp <= 66 ? 255 : clamp(329.698727446 * (temp - 60) ** -0.1332047592);

  const g =
    temp <= 66
      ? clamp(99.4708025861 * Math.log(temp) - 161.1195681661)
      : clamp(288.1221695283 * (temp - 60) ** -0.0755148492);

  const b =
    temp >= 66
      ? 255
      : temp <= 19
        ? 0
        : clamp(138.5177312231 * Math.log(temp - 10) - 305.0447927307);

  return { r, g, b };
}

describe('KelvinToRgbBoxSource', () => {
  describe('generateBoxes — option guard', () => {
    it('returns [] when no matching option key is present', async () => {
      const boxes = await KelvinToRgbBoxSource.generateBoxes('6500', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when unrelated option keys are present', async () => {
      const boxes = await KelvinToRgbBoxSource.generateBoxes('6500', {
        base64: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes — valid input via ::kelvin', () => {
    it('6500K — near white: R===255 and Hex starts with #ff', async () => {
      const { r, g, b } = kelvinToRgb(6500);
      const boxes = await KelvinToRgbBoxSource.generateBoxes('6500', {
        kelvin: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Kelvin).toBe('6500K');
      expect(opts.RGB).toBe(`rgb(${r}, ${g}, ${b})`);
      // R channel must be 255 for 6500K (temp<=66)
      expect(r).toBe(255);
      // G and B are high for daylight white
      expect(g).toBeGreaterThanOrEqual(240);
      expect(b).toBeGreaterThanOrEqual(240);
      expect(opts.Hex).toMatch(/^#ff/);
    });

    it('1000K — very warm: R===255, B===0', async () => {
      const { r, b } = kelvinToRgb(1000);
      const boxes = await KelvinToRgbBoxSource.generateBoxes('1000', {
        kelvin: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Kelvin).toBe('1000K');
      // 1000K: temp=10, <=66 → R=255; temp<=19 → B=0
      expect(r).toBe(255);
      expect(b).toBe(0);
      expect(opts.RGB).toMatch(/^rgb\(255,/);
      expect(opts.RGB).toMatch(/, 0\)$/);
    });

    it('40000K — cool: B===255, R<255', async () => {
      const { r, b } = kelvinToRgb(40000);
      const boxes = await KelvinToRgbBoxSource.generateBoxes('40000', {
        kelvin: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Kelvin).toBe('40000K');
      // 40000K: temp=400 >66 → B=255; R is reduced
      expect(b).toBe(255);
      expect(r).toBeLessThan(255);
      expect(opts.Hex).toMatch(/ff$/); // ends with ff for blue channel
    });

    it('2700K — incandescent: R===255, G and B lower than R', async () => {
      const { r, g, b } = kelvinToRgb(2700);
      const boxes = await KelvinToRgbBoxSource.generateBoxes('2700', {
        kelvin: true,
      });
      expect(boxes).toHaveLength(1);
      expect(r).toBe(255);
      expect(g).toBeLessThan(r);
      expect(b).toBeLessThan(r);
    });

    it('trailing K suffix "5000K" is parsed as 5000', async () => {
      const { r, g, b } = kelvinToRgb(5000);
      const boxes = await KelvinToRgbBoxSource.generateBoxes('5000K', {
        kelvin: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Kelvin).toBe('5000K');
      expect(opts.RGB).toBe(`rgb(${r}, ${g}, ${b})`);
    });
  });

  describe('generateBoxes — ::colortemp alias', () => {
    it('accepts ::colortemp option key', async () => {
      const boxes = await KelvinToRgbBoxSource.generateBoxes('6500', {
        colortemp: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Kelvin).toBe('6500K');
    });
  });

  describe('generateBoxes — invalid input', () => {
    it('non-numeric input returns an error box mentioning Kelvin', async () => {
      const boxes = await KelvinToRgbBoxSource.generateBoxes('abc', {
        kelvin: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      // error box should mention Kelvin in its message
      const combined = JSON.stringify(opts).toLowerCase();
      expect(combined).toContain('kelvin');
    });

    it('empty string returns an error box mentioning Kelvin', async () => {
      const boxes = await KelvinToRgbBoxSource.generateBoxes('', {
        kelvin: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      const combined = JSON.stringify(opts).toLowerCase();
      expect(combined).toContain('kelvin');
    });
  });

  describe('generateBoxes — clamping', () => {
    it('value below 1000 is clamped to 1000', async () => {
      const boxes = await KelvinToRgbBoxSource.generateBoxes('500', {
        kelvin: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Kelvin).toBe('1000K');
    });

    it('value above 40000 is clamped to 40000', async () => {
      const boxes = await KelvinToRgbBoxSource.generateBoxes('99999', {
        kelvin: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Kelvin).toBe('40000K');
    });
  });
});
