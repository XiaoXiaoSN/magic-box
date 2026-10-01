import { describe, expect, it } from 'vitest';

import { decodeGeohash, encodeGeohash, isGeohash } from '../geohash';

// expected hashes come from pygeohash
describe('geohash', () => {
  it.each([
    [40.446195, -79.948862, 'dppnhep00'],
    [25.033964, 121.564468, 'wsqqqm293'],
    [-33.8568, 151.2153, 'r3gx2ux9g'],
    [0, 0, 's00000000'],
  ])('encodes %f, %f', (lat, lng, hash) => {
    expect(encodeGeohash(lat, lng)).toBe(hash);
  });

  it('honours the requested length', () => {
    expect(encodeGeohash(57.64911, 10.40744, 11)).toBe('u4pruydqqvj');
  });

  it.each([
    ['ezs42', 42.60498046875, -5.60302734375],
    ['U4PRUYDQQVJ', 57.64911063015461, 10.407439693808556],
  ])('decodes %s to its cell centre', (hash, lat, lng) => {
    const point = decodeGeohash(hash);
    expect(point?.lat).toBeCloseTo(lat, 12);
    expect(point?.lng).toBeCloseTo(lng, 12);
  });

  it('rejects characters outside the alphabet', () => {
    // a, i, l and o are not geohash digits
    expect(isGeohash('dppnhepa0')).toBe(false);
    expect(decodeGeohash('ezs4i')).toBeNull();
    expect(isGeohash('0123456789bcd')).toBe(false);
  });
});
