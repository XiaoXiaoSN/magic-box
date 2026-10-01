import { describe, expect, it } from 'vitest';

import {
  formatDdm,
  formatDecimal,
  formatDms,
  parseAngle,
  parseCoordinate,
} from '../angle';

describe('parseAngle', () => {
  it.each([
    ['40.446195', 40.446195, null],
    ['-73.985', -73.985, null],
    ['+12.5', 12.5, null],
    [`40°26'46.3"N`, 40 + 26 / 60 + 46.3 / 3600, 'lat'],
    [`33°51'54"S`, -(33 + 51 / 60 + 54 / 3600), 'lat'],
    ['40 26 46.3', 40 + 26 / 60 + 46.3 / 3600, null],
    ['40:26:46.3', 40 + 26 / 60 + 46.3 / 3600, null],
    [`W 79° 56.9317'`, -(79 + 56.9317 / 60), 'lng'],
    ['40°26.7717′N', 40 + 26.7717 / 60, 'lat'],
    ['40º26′46″N', 40 + 26 / 60 + 46 / 3600, 'lat'],
    [`40°26'46''E`, 40 + 26 / 60 + 46 / 3600, 'lng'],
    ['121.5e', 121.5, 'lng'],
  ])('reads %s', (text, value, axis) => {
    const angle = parseAngle(text);
    expect(angle?.value).toBeCloseTo(value, 12);
    expect(angle?.axis).toBe(axis);
  });

  it.each([
    ['', 'empty'],
    ['N', 'a hemisphere alone'],
    ['-40°N', 'a sign that contradicts the hemisphere'],
    [`40.5°30'`, 'a fraction before the last part'],
    [`40°60'`, 'minutes of 60'],
    [`40°26'60"`, 'seconds of 60'],
    [`40'26°`, 'marks out of order'],
    ['40 26 46 12', 'more than three parts'],
    ['40..5', 'a malformed number'],
    ['abc', 'letters'],
    ['N40°E', 'two hemispheres'],
  ])('rejects %s (%s)', (text) => {
    expect(parseAngle(text)).toBeNull();
  });
});

describe('parseCoordinate', () => {
  const pair = (text: string) => {
    const parsed = parseCoordinate(text);
    if (parsed?.kind !== 'pair') throw new Error(`not a pair: ${text}`);
    return [parsed.lat.value, parsed.lng.value];
  };

  it('splits on a comma', () => {
    expect(pair('40.446195, -79.948862')).toEqual([40.446195, -79.948862]);
    expect(pair('40.446195,-79.948862')).toEqual([40.446195, -79.948862]);
  });

  it('splits on whitespace where both halves are angles', () => {
    expect(pair('40.446195 -79.948862')).toEqual([40.446195, -79.948862]);
    const [lat, lng] = pair(`40°26'46.3"N 79°56'55.9"W`);
    expect(lat).toBeCloseTo(40.446194, 6);
    expect(lng).toBeCloseTo(-79.948861, 6);
    expect(pair('N 40 26 46 W 79 56 55')[1]).toBeCloseTo(-79.9486, 4);
  });

  it('puts the latitude first when the hemispheres are swapped', () => {
    const [lat, lng] = pair(`79°56'55.9"W, 40°26'46.3"N`);
    expect(lat).toBeCloseTo(40.446194, 6);
    expect(lng).toBeCloseTo(-79.948861, 6);
  });

  it('reads space-separated parts as one angle before trying a pair', () => {
    const parsed = parseCoordinate('40 30');
    expect(parsed?.kind).toBe('single');
    expect(pair('40, 30')).toEqual([40, 30]);
  });

  it.each([
    ['40N, 30N', 'two latitudes'],
    ['1, 2, 3', 'three values'],
    ['40.4 x', 'a half that is not an angle'],
    ['', 'empty input'],
  ])('rejects %s (%s)', (text) => {
    expect(parseCoordinate(text)).toBeNull();
  });
});

describe('formatting', () => {
  it('trims decimals to 6 places', () => {
    expect(formatDecimal(-73.985)).toBe('-73.985');
    expect(formatDecimal(40.44619444444)).toBe('40.446194');
    expect(formatDecimal(-1e-9)).toBe('0');
  });

  it('formats DMS with a hemisphere or a sign', () => {
    expect(formatDms(40.446195, null)).toBe(`40°26'46.30"`);
    expect(formatDms(-79.948862, 'lng')).toBe(`79°56'55.90"W`);
    expect(formatDms(-73.985, null)).toBe(`-73°59'6.00"`);
  });

  it('carries rounded seconds into minutes and degrees', () => {
    // 59.9999" rounds to 60.00", which must print as the next minute
    expect(formatDms(10 + 59 / 60 + 59.9999 / 3600, 'lat')).toBe(`11°0'0.00"N`);
  });

  it('formats DDM', () => {
    expect(formatDdm(40.446195, 'lat')).toBe(`40°26.7717'N`);
    expect(formatDdm(-33.8568, 'lat')).toBe(`33°51.4080'S`);
  });

  it('never prints a negative zero', () => {
    expect(formatDms(-1e-9, null)).toBe(`0°0'0.00"`);
    expect(formatDms(-1e-9, 'lat')).toBe(`0°0'0.00"N`);
  });
});
