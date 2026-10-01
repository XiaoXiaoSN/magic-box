import { describe, expect, it } from 'vitest';

import {
  decodePlusCode,
  encodePlusCode,
  isFullPlusCode,
  isValidPlusCode,
} from '../plusCode';

// expected codes come from Google's reference implementation
// (openlocationcode on PyPI)
describe('encodePlusCode', () => {
  it.each([
    [40.446195, -79.948862, '87G2C3W2+FF', '87G2C3W2+FFC'],
    [25.033964, 121.564468, '7QQ32HM7+HQ', '7QQ32HM7+HQP'],
    [-33.8568, 151.2153, '4RRH46V8+74', '4RRH46V8+74M'],
    [51.5007, -0.1246, '9C3XGV2G+75', '9C3XGV2G+75J'],
    [0, 0, '6FG22222+22', '6FG22222+222'],
    [-79.9, -179.9, '22G24422+22', '22G24422+222'],
  ])('encodes %f, %f', (lat, lng, code10, code11) => {
    expect(encodePlusCode(lat, lng)).toBe(code10);
    expect(encodePlusCode(lat, lng, 11)).toBe(code11);
  });

  it('pads codes shorter than 8 digits', () => {
    expect(encodePlusCode(47.5, 8.5, 4)).toBe('8FVC0000+');
  });

  it('keeps the north pole and the antimeridian inside the grid', () => {
    expect(encodePlusCode(90, 180)).toBe(encodePlusCode(89.99999, -180));
  });
});

describe('decodePlusCode', () => {
  it.each([
    ['87G2C3W2+FF', 40.4461875, -79.9488125],
    ['7qq32hqw+hr', 25.0389375, 121.5970625],
    ['8FVC0000+', 47.5, 8.5],
    ['8FVC9G8F+6XQ', 47.3655875, 8.524984375],
  ])('decodes %s to its cell centre', (code, lat, lng) => {
    const area = decodePlusCode(code);
    expect(area?.lat).toBeCloseTo(lat, 9);
    expect(area?.lng).toBeCloseTo(lng, 9);
  });

  it('refuses short codes', () => {
    expect(decodePlusCode('Q257+5X')).toBeNull();
  });
});

describe('validation', () => {
  it.each([
    ['87G2C3W2+FF', true, true],
    ['CFX3X2X2+X2', true, true],
    ['8FVC0000+', true, true],
    ['Q257+5X', true, false],
    ['87G2C3W2+F', false, false],
    ['8FVC000+', false, false],
    ['8FV+', false, false],
    ['8FVC0000+22', false, false],
    ['87G2C3W2FF', false, false],
    ['87G2C3W2+FA', false, false],
  ])('%s → valid %s, full %s', (code, valid, full) => {
    expect(isValidPlusCode(code)).toBe(valid);
    expect(isFullPlusCode(code)).toBe(full);
  });
});
