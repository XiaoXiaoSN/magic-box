import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { HaversineBoxSource } from '../HaversineBoxSource';

describe('HaversineBoxSource', () => {
  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(HaversineBoxSource.name).toBe('Distance');
      expect(HaversineBoxSource.tag).toBe('#');
      expect(HaversineBoxSource.kind).toBe('Calculate');
      expect(HaversineBoxSource.priority).toBe(10);
    });
  });

  describe('generateBoxes - option gate', () => {
    it('returns [] when no option is provided', async () => {
      const boxes = await HaversineBoxSource.generateBoxes(
        '40.7128,-74.0060 to 51.5074,-0.1278',
        null,
      );
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for empty options object', async () => {
      const boxes = await HaversineBoxSource.generateBoxes(
        '40.7128,-74.0060 to 51.5074,-0.1278',
        {},
      );
      expect(boxes).toHaveLength(0);
    });

    it('activates on ::haversine option', async () => {
      const boxes = await HaversineBoxSource.generateBoxes(
        '40.7128,-74.0060 to 51.5074,-0.1278',
        { haversine: true },
      );
      expect(boxes).toHaveLength(1);
    });

    it('activates on ::distance option', async () => {
      const boxes = await HaversineBoxSource.generateBoxes(
        '40.7128,-74.0060 to 51.5074,-0.1278',
        { distance: true },
      );
      expect(boxes).toHaveLength(1);
    });
  });

  describe('generateBoxes - NYC to London', () => {
    it('Kilometers is approximately 5570 km', async () => {
      const boxes = await HaversineBoxSource.generateBoxes(
        '40.7128,-74.0060 to 51.5074,-0.1278',
        { haversine: true },
      );
      expect(boxes).toHaveLength(1);
      const kv = boxes[0].props.options as Record<string, string>;
      const km = Number.parseFloat(kv.Kilometers);
      expect(km).toBeGreaterThan(5560);
      expect(km).toBeLessThan(5580);
    });

    it('uses KeyValueBoxTemplate', async () => {
      const boxes = await HaversineBoxSource.generateBoxes(
        '40.7128,-74.0060 to 51.5074,-0.1278',
        { haversine: true },
      );
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
    });

    it('box name is Distance', async () => {
      const boxes = await HaversineBoxSource.generateBoxes(
        '40.7128,-74.0060 to 51.5074,-0.1278',
        { haversine: true },
      );
      expect(boxes[0].props.name).toBe('Distance');
    });

    it('priority is set', async () => {
      const boxes = await HaversineBoxSource.generateBoxes(
        '40.7128,-74.0060 to 51.5074,-0.1278',
        { haversine: true },
      );
      expect(boxes[0].props.priority).toBe(10);
    });

    it('Miles ≈ km * 0.621371', async () => {
      const boxes = await HaversineBoxSource.generateBoxes(
        '40.7128,-74.0060 to 51.5074,-0.1278',
        { haversine: true },
      );
      const kv = boxes[0].props.options as Record<string, string>;
      const km = Number.parseFloat(kv.Kilometers);
      const miles = Number.parseFloat(kv.Miles);
      expect(miles).toBeCloseTo(km * 0.621371, 2);
    });

    it('kv options contain all expected keys', async () => {
      const boxes = await HaversineBoxSource.generateBoxes(
        '40.7128,-74.0060 to 51.5074,-0.1278',
        { haversine: true },
      );
      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv).toHaveProperty('From');
      expect(kv).toHaveProperty('To');
      expect(kv).toHaveProperty('Kilometers');
      expect(kv).toHaveProperty('Miles');
      expect(kv).toHaveProperty('Nautical Miles');
      expect(kv).toHaveProperty('Initial Bearing');
    });
  });

  describe('generateBoxes - same point (0,0 to 0,0)', () => {
    it('Kilometers is 0', async () => {
      const boxes = await HaversineBoxSource.generateBoxes('0,0 to 0,0', {
        haversine: true,
      });
      expect(boxes).toHaveLength(1);
      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv.Kilometers).toBe('0');
    });
  });

  describe('generateBoxes - equator quarter (0,0 to 0,90)', () => {
    it('Kilometers ≈ 10018.75 (quarter circumference)', async () => {
      const boxes = await HaversineBoxSource.generateBoxes('0,0 to 0,90', {
        haversine: true,
      });
      expect(boxes).toHaveLength(1);
      const kv = boxes[0].props.options as Record<string, string>;
      const km = Number.parseFloat(kv.Kilometers);
      expect(km).toBeGreaterThan(10000);
      expect(km).toBeLessThan(10040);
    });
  });

  describe('generateBoxes - equator half (0,0 to 0,180)', () => {
    it('Kilometers ≈ 20037.5 (half circumference)', async () => {
      const boxes = await HaversineBoxSource.generateBoxes('0,0 to 0,180', {
        haversine: true,
      });
      expect(boxes).toHaveLength(1);
      const kv = boxes[0].props.options as Record<string, string>;
      const km = Number.parseFloat(kv.Kilometers);
      // half circumference: 2 * pi * R / 2 = pi * 6371.0088 ≈ 20015
      expect(km).toBeGreaterThan(20000);
      expect(km).toBeLessThan(20060);
    });
  });

  describe('generateBoxes - alternate separators', () => {
    it('accepts semicolon separator', async () => {
      const boxes = await HaversineBoxSource.generateBoxes('0,0;0,90', {
        haversine: true,
      });
      expect(boxes).toHaveLength(1);
      const kv = boxes[0].props.options as Record<string, string>;
      const km = Number.parseFloat(kv.Kilometers);
      expect(km).toBeGreaterThan(10000);
    });

    it('accepts pipe separator', async () => {
      const boxes = await HaversineBoxSource.generateBoxes('0,0|0,90', {
        haversine: true,
      });
      expect(boxes).toHaveLength(1);
      const kv = boxes[0].props.options as Record<string, string>;
      const km = Number.parseFloat(kv.Kilometers);
      expect(km).toBeGreaterThan(10000);
    });
  });

  describe('generateBoxes - invalid inputs', () => {
    it('returns an error box for "hello"', async () => {
      const boxes = await HaversineBoxSource.generateBoxes('hello', {
        haversine: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/invalid input/i);
    });

    it('returns an error box for bad lat (91,0 to 0,0)', async () => {
      const boxes = await HaversineBoxSource.generateBoxes('91,0 to 0,0', {
        haversine: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/invalid input/i);
    });

    it('returns an error box for bad lng (0,0 to 0,181)', async () => {
      const boxes = await HaversineBoxSource.generateBoxes('0,0 to 0,181', {
        haversine: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/invalid input/i);
    });

    it('returns an error box when only one pair is given', async () => {
      const boxes = await HaversineBoxSource.generateBoxes('40.7128,-74.0060', {
        haversine: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/invalid input/i);
    });

    it('returns an error box for input exceeding 100 chars', async () => {
      const long = `${'0,0'.repeat(20)} to 0,0`;
      const boxes = await HaversineBoxSource.generateBoxes(long, {
        haversine: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/invalid input/i);
    });
  });

  describe('generateBoxes - plaintext output', () => {
    it('plaintextOutput contains key: value lines', async () => {
      const boxes = await HaversineBoxSource.generateBoxes(
        '40.7128,-74.0060 to 51.5074,-0.1278',
        { haversine: true },
      );
      const text = boxes[0].props.plaintextOutput;
      expect(text).toMatch(/Kilometers:/);
      expect(text).toMatch(/Miles:/);
      expect(text).toMatch(/Nautical Miles:/);
      expect(text).toMatch(/Initial Bearing:/);
    });
  });
});
