import type { BoxOptions } from '@modules/Box';
import { describe, expect, it } from 'vitest';
import { FuelEconomyBoxSource } from '../FuelEconomyBoxSource';

// convenience wrapper — trigger via ::fuel option
const gen = (input: string, opts: BoxOptions = { fuel: true }) =>
  FuelEconomyBoxSource.generateBoxes(input, opts);

describe('FuelEconomyBoxSource', () => {
  describe('option gating', () => {
    it('returns [] when no matching option is present', async () => {
      expect(await gen('30 mpg', {})).toHaveLength(0);
      expect(await gen('30 mpg', null)).toHaveLength(0);
      expect(await gen('30 mpg', { unrelated: true })).toHaveLength(0);
    });

    it('triggers on ::fuel', async () => {
      expect(await gen('30 mpg', { fuel: true })).toHaveLength(1);
    });

    it('triggers on ::mpg', async () => {
      expect(await gen('30 mpg', { mpg: true })).toHaveLength(1);
    });
  });

  describe('30 mpg (US) via ::fuel', () => {
    it('produces one box', async () => {
      const boxes = await gen('30 mpg');
      expect(boxes).toHaveLength(1);
    });

    it('box template is KeyValueBoxTemplate', async () => {
      const { KeyValueBoxTemplate } = await import('@components/BoxTemplate');
      const boxes = await gen('30 mpg');
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
    });

    it('box name is "Fuel Economy"', async () => {
      const boxes = await gen('30 mpg');
      expect(boxes[0].props.name).toBe('Fuel Economy');
    });

    it('L/100km ≈ 7.840486 (235.214583 / 30)', async () => {
      const boxes = await gen('30 mpg');
      const opts = boxes[0].props.options as Record<string, string>;
      // well-known constant: 235.214583 / 30 ≈ 7.840486
      expect(opts['L/100km']).toMatch(/^7\.84/);
    });

    it('Input field reflects original input', async () => {
      const boxes = await gen('30 mpg');
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Input).toBe('30 mpg');
    });

    it('MPG (US) round-trips back to ~30', async () => {
      const boxes = await gen('30 mpg');
      const opts = boxes[0].props.options as Record<string, string>;
      expect(Number.parseFloat(opts['MPG (US)'])).toBeCloseTo(30, 3);
    });
  });

  describe('round-trip: L/100km → MPG (US)', () => {
    it('7.840486 l/100km → MPG (US) ≈ 30', async () => {
      const boxes = await gen('7.840486 l/100km');
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(Number.parseFloat(opts['MPG (US)'])).toBeCloseTo(30, 2);
    });
  });

  describe('km/L input', () => {
    it('10 km/l → L/100km = 10', async () => {
      const boxes = await gen('10 km/l');
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      // 100 / 10 = 10 exactly
      expect(opts['L/100km']).toBe('10');
    });

    it('10 kml alias also works', async () => {
      const boxes = await gen('10 kml');
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['L/100km']).toBe('10');
    });
  });

  describe('imperial MPG', () => {
    it('50 mpguk → L/100km starts with 5.64 (282.480936/50)', async () => {
      const boxes = await gen('50 mpguk');
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      // 282.480936 / 50 = 5.649619
      expect(opts['L/100km']).toMatch(/^5\.64/);
    });

    it('mpg-uk alias works', async () => {
      const boxes = await gen('50 mpg-uk');
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['L/100km']).toMatch(/^5\.64/);
    });

    it('mpgimp alias works', async () => {
      const boxes = await gen('50 mpgimp');
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['L/100km']).toMatch(/^5\.64/);
    });
  });

  describe('error cases — return a box (not [])', () => {
    it('value 0 → error box', async () => {
      const boxes = await gen('0 mpg');
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Error).toBeDefined();
    });

    it('negative value → error box', async () => {
      const boxes = await gen('-5 mpg');
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Error).toBeDefined();
    });

    it('non-numeric value "abc" → error box', async () => {
      const boxes = await gen('abc mpg');
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Error).toBeDefined();
    });

    it('unknown unit "5 foo" → error box', async () => {
      const boxes = await gen('5 foo');
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Error).toBeDefined();
    });

    it('bare word with no unit → error box', async () => {
      const boxes = await gen('abc');
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Error).toBeDefined();
    });
  });

  describe('unit aliases', () => {
    it('mpg-us alias resolves same as mpg', async () => {
      const a = await gen('30 mpg');
      const b = await gen('30 mpg-us');
      const optsA = a[0].props.options as Record<string, string>;
      const optsB = b[0].props.options as Record<string, string>;
      expect(optsA['L/100km']).toBe(optsB['L/100km']);
    });

    it('l100km alias resolves same as l/100km', async () => {
      const a = await gen('7.840486 l/100km');
      const b = await gen('7.840486 l100km');
      const optsA = a[0].props.options as Record<string, string>;
      const optsB = b[0].props.options as Record<string, string>;
      expect(optsA['MPG (US)']).toBe(optsB['MPG (US)']);
    });
  });
});
