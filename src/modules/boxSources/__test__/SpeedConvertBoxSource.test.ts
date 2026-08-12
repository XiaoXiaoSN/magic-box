import { describe, expect, it } from 'vitest';
import { SpeedConvertBoxSource } from '../SpeedConvertBoxSource';

describe('SpeedConvertBoxSource', () => {
  it('returns [] when ::speed option is absent', async () => {
    const boxes = await SpeedConvertBoxSource.generateBoxes('100 km/h', null);
    expect(boxes).toEqual([]);
  });

  it('returns [] when options object has no speed key', async () => {
    const boxes = await SpeedConvertBoxSource.generateBoxes('100 km/h', {
      foo: true,
    });
    expect(boxes).toEqual([]);
  });

  describe('100 km/h conversion', () => {
    it('produces a single box', async () => {
      const boxes = await SpeedConvertBoxSource.generateBoxes('100 km/h', {
        speed: true,
      });
      expect(boxes).toHaveLength(1);
    });

    it('converts m/s to 27.777778', async () => {
      const boxes = await SpeedConvertBoxSource.generateBoxes('100 km/h', {
        speed: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['m/s']).toBe('27.777778');
    });

    it('converts mph to 62.137119', async () => {
      const boxes = await SpeedConvertBoxSource.generateBoxes('100 km/h', {
        speed: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.mph).toBe('62.137119');
    });

    it('converts knot to 53.99568', async () => {
      const boxes = await SpeedConvertBoxSource.generateBoxes('100 km/h', {
        speed: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      // 100 km/h = 100000/3600 m/s; knot = 1852/3600 m/s => 100000/1852 = 53.995680...
      expect(opts.knot).toBe('53.99568');
    });

    it('preserves Input label', async () => {
      const boxes = await SpeedConvertBoxSource.generateBoxes('100 km/h', {
        speed: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Input).toBe('100 km/h');
    });
  });

  describe('1 m/s conversion', () => {
    it('km/h is exactly 3.6', async () => {
      const boxes = await SpeedConvertBoxSource.generateBoxes('1 m/s', {
        speed: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['km/h']).toBe('3.6');
    });

    it('ft/s is approximately 3.28084', async () => {
      const boxes = await SpeedConvertBoxSource.generateBoxes('1 m/s', {
        speed: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      // 1/0.3048 = 3.280839895... -> rounds to 3.28084
      expect(opts['ft/s']).toBe('3.28084');
    });

    it('m/s is exactly 1', async () => {
      const boxes = await SpeedConvertBoxSource.generateBoxes('1 m/s', {
        speed: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['m/s']).toBe('1');
    });
  });

  describe('60 mph conversion', () => {
    it('km/h is 96.56064', async () => {
      const boxes = await SpeedConvertBoxSource.generateBoxes('60 mph', {
        speed: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      // 60 * 1609.344 / 3600 * 3600/1000 = 60 * 1609.344 / 1000 = 96.56064
      expect(opts['km/h']).toBe('96.56064');
    });
  });

  describe('1 knot conversion', () => {
    it('km/h is exactly 1.852', async () => {
      const boxes = await SpeedConvertBoxSource.generateBoxes('1 knot', {
        speed: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['km/h']).toBe('1.852');
    });
  });

  describe('invalid inputs', () => {
    it('bare word "fast" produces an error box mentioning supported units', async () => {
      const boxes = await SpeedConvertBoxSource.generateBoxes('fast', {
        speed: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Supported units']).toBeTruthy();
      expect(opts.Error).toBeTruthy();
    });

    it('"5 warp" produces an error box for unknown unit', async () => {
      const boxes = await SpeedConvertBoxSource.generateBoxes('5 warp', {
        speed: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Supported units']).toBeTruthy();
      expect(opts.Error).toMatch(/warp/i);
    });
  });

  describe('alias support', () => {
    it('kph alias works same as km/h', async () => {
      const boxes = await SpeedConvertBoxSource.generateBoxes('100 kph', {
        speed: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['m/s']).toBe('27.777778');
    });

    it('fps alias works same as ft/s', async () => {
      const boxes = await SpeedConvertBoxSource.generateBoxes('1 fps', {
        speed: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      // 1 ft/s = 0.3048 m/s -> 0.3048 * 3600/1000 = 1.09728 km/h
      expect(opts['m/s']).toBe('0.3048');
    });
  });
});
