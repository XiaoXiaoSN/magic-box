import { describe, expect, it } from 'vitest';

import { formatMgrs, formatUtm, toUtm } from '../utm';

// expected values come from the `utm` and `mgrs` (GeoTrans) packages on PyPI
describe('toUtm / formatUtm / formatMgrs', () => {
  it.each([
    [40.446195, -79.948862, '17T 589139 4477813', '17T NE 89138 77812'],
    [25.033964, 121.564468, '51R 355171 2769476', '51R UH 55170 69476'],
    [-33.8568, 151.2153, '56H 334901 6252289', '56H LH 34900 52288'],
    [51.5007, -0.1246, '30U 699568 5709428', '30U XC 99567 09427'],
    [0, 0, '31N 166021 0', '31N AA 66021 00000'],
    [-79.9, -179.9, '1C 443248 1128161', '1C DM 43247 28161'],
  ])('converts %f, %f', (lat, lng, utm, mgrs) => {
    const result = toUtm(lat, lng);
    if (!result) throw new Error('outside UTM');
    expect(formatUtm(result)).toBe(utm);
    expect(formatMgrs(result)).toBe(mgrs);
  });

  it('applies the Norway and Svalbard zone exceptions', () => {
    expect(toUtm(60.5, 4.5)?.zone).toBe(32);
    expect(toUtm(78.2232, 15.6267)?.zone).toBe(33);
    expect(toUtm(78, 8.9)?.zone).toBe(31);
    expect(toUtm(78, 9.1)?.zone).toBe(33);
  });

  it('matches the reference projection to the millimetre', () => {
    const result = toUtm(60.5, 4.5);
    if (!result) throw new Error('outside UTM');
    expect(result.easting).toBeCloseTo(252928.8, 0);
    expect(formatMgrs(result)).toBe('32V KN 52928 15548');
  });

  it('returns null outside 80°S–84°N', () => {
    expect(toUtm(84.0001, 0)).toBeNull();
    expect(toUtm(-80.0001, 0)).toBeNull();
    expect(toUtm(84, 0)?.band).toBe('X');
  });
});
