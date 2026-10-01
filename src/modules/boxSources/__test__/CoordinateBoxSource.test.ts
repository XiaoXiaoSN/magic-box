import type { BoxOptions } from '@modules/Box';
import { describe, expect, it } from 'vitest';

import { CoordinateBoxSource } from '../CoordinateBoxSource';

const run = (input: string, options: BoxOptions) =>
  CoordinateBoxSource.generateBoxes(input, options);

const rows = async (input: string, options: BoxOptions = { coord: true }) => {
  const boxes = await run(input, options);
  expect(boxes).toHaveLength(1);
  expect(boxes[0].props.name).toBe('Coordinates');
  return boxes[0].props.options as Record<string, string>;
};

describe('CoordinateBoxSource', () => {
  describe('gating', () => {
    it('returns [] without a coordinate option', async () => {
      expect(await run('40.446195, -79.948862', null)).toHaveLength(0);
      expect(await run('40.446195, -79.948862', { json: true })).toHaveLength(
        0,
      );
    });

    it('returns [] for empty or overlong input', async () => {
      expect(await run('  ', { coord: true })).toHaveLength(0);
      expect(await run('1'.repeat(101), { coord: true })).toHaveLength(0);
    });

    it.each([
      'coord',
      'coords',
      'latlng',
      'latlon',
    ])('::%s shows the full table', async (key) => {
      const table = await rows('40.446195, -79.948862', { [key]: true });
      expect(Object.keys(table)).toEqual([
        'Decimal',
        'DDM',
        'DMS',
        'Plus Code',
        'Geohash',
        'UTM',
        'MGRS',
        'geo URI',
      ]);
    });
  });

  describe('a latitude/longitude pair', () => {
    it('converts decimal degrees to every format', async () => {
      expect(await rows('40.446195, -79.948862')).toEqual({
        Decimal: '40.446195, -79.948862',
        DDM: `40°26.7717'N 79°56.9317'W`,
        DMS: `40°26'46.30"N 79°56'55.90"W`,
        'Plus Code': '87G2C3W2+FF',
        Geohash: 'dppnhep00',
        UTM: '17T 589139 4477813',
        MGRS: '17T NE 89138 77812',
        'geo URI': 'geo:40.446195,-79.948862',
      });
    });

    it('reads DMS with hemispheres', async () => {
      const table = await rows(`33°51'24.5"S 151°12'55.1"E`);
      expect(table.Decimal).toBe('-33.856806, 151.215306');
      expect(table.DMS).toBe(`33°51'24.50"S 151°12'55.10"E`);
    });

    it('reads a Plus Code and echoes it unchanged', async () => {
      const table = await rows('7qq32hqw+hr');
      expect(table['Plus Code']).toBe('7QQ32HQW+HR');
      // the cell centre 25.0389375, 121.5970625 sits on a 7th-decimal tie, so
      // the 6-decimal output may round either way
      const [lat, lng] = table.Decimal.split(', ').map(Number);
      expect(lat).toBeCloseTo(25.0389375, 5);
      expect(lng).toBeCloseTo(121.5970625, 5);
    });

    it('reads a Geohash and echoes it unchanged', async () => {
      const table = await rows('ezs42');
      expect(table.Geohash).toBe('ezs42');
      expect(table.Decimal).toBe('42.60498, -5.603027');
    });

    it('leaves UTM and MGRS out of the table near the poles', async () => {
      const table = await rows('85, 10');
      expect(table.UTM).toBeUndefined();
      expect(table.MGRS).toBeUndefined();
      expect(table['Plus Code']).toBeDefined();
    });
  });

  describe('a single angle', () => {
    it('shows only the angle formats', async () => {
      expect(await rows('40.446195')).toEqual({
        Decimal: '40.446195',
        DDM: `40°26.7717'`,
        DMS: `40°26'46.30"`,
      });
    });

    it('keeps the sign of a negative angle', async () => {
      const table = await rows('-73.985');
      expect(table.DMS).toBe(`-73°59'6.00"`);
    });

    it('keeps the hemisphere it was given', async () => {
      const table = await rows(`33°51'54"S`);
      expect(table.Decimal).toBe('-33.865');
      expect(table.DMS).toBe(`33°51'54.00"S`);
    });
  });

  describe('format options', () => {
    it.each([
      ['dms', 'DMS', `40°26'46.30"N 79°56'55.90"W`],
      ['ddm', 'DDM', `40°26.7717'N 79°56.9317'W`],
      ['dd', 'Decimal', '40.446195, -79.948862'],
      ['pluscode', 'Plus Code', '87G2C3W2+FF'],
      ['olc', 'Plus Code', '87G2C3W2+FF'],
      ['geohash', 'Geohash', 'dppnhep00'],
      ['utm', 'UTM', '17T 589139 4477813'],
      ['mgrs', 'MGRS', '17T NE 89138 77812'],
      ['geo', 'geo URI', 'geo:40.446195,-79.948862'],
    ])('::%s shows only %s', async (key, label, value) => {
      const boxes = await run('40.446195, -79.948862', { [key]: true });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe(label);
      expect(boxes[0].props.plaintextOutput).toBe(value);
    });

    it('shows several formats in table order', async () => {
      const boxes = await run('40.446195, -79.948862', {
        mgrs: true,
        dms: true,
      });
      expect(boxes.map((b) => b.props.name)).toEqual(['DMS', 'MGRS']);
    });

    it('explains a grid format that needs both axes', async () => {
      const boxes = await run('40.446195', { pluscode: true, dms: true });
      expect(boxes.map((b) => b.props.name)).toEqual(['DMS', 'Plus Code']);
      expect(boxes[0].props.plaintextOutput).toBe(`40°26'46.30"`);
      expect(boxes[1].props.plaintextOutput).toMatch(
        /needs a latitude and a longitude/,
      );
    });

    it('explains UTM outside its latitude range', async () => {
      const boxes = await run('85, 10', { utm: true });
      expect(boxes[0].props.plaintextOutput).toMatch(/80°S to 84°N/);
    });
  });

  describe('invalid input', () => {
    it('shows the accepted formats for unreadable input', async () => {
      const boxes = await run('hello there', { coord: true });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toContain('Expected a coordinate');
    });

    it.each([
      ['999', /An angle must be between -180 and 180/],
      ['91N', /Latitude must be between -90 and 90/],
      ['91, 10', /Latitude must be between -90 and 90/],
      ['10, 181', /Longitude must be between -180 and 180/],
    ])('rejects out-of-range %s', async (input, message) => {
      const boxes = await run(input, { coord: true });
      expect(boxes[0].props.plaintextOutput).toMatch(message);
    });

    it('asks for the full code when given a short Plus Code', async () => {
      const boxes = await run('Q257+5X', { coord: true });
      expect(boxes[0].props.plaintextOutput).toMatch(/reference location/);
    });
  });
});
