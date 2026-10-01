// WGS 84 latitude/longitude → UTM and MGRS.
// the projection uses Krüger's series to order n⁶ (Karney 2011,
// https://arxiv.org/abs/1002.1417), accurate to well under a millimetre
// inside a zone. polar regions use UPS, which is out of scope here.

const A = 6378137;
const F = 1 / 298.257223563;
const K0 = 0.9996;
const FALSE_EASTING = 500_000;
const FALSE_NORTHING = 10_000_000;

export const UTM_MIN_LAT = -80;
export const UTM_MAX_LAT = 84;

const E = Math.sqrt(F * (2 - F));
const N = F / (2 - F);
const N2 = N * N;
const N3 = N2 * N;
const N4 = N3 * N;
const N5 = N4 * N;
const N6 = N5 * N;
// rectifying radius, scaled by the central meridian's scale factor
const K0_A = ((K0 * A) / (1 + N)) * (1 + N2 / 4 + N4 / 64 + N6 / 256);
// Krüger α₁…α₆
const ALPHA = [
  N / 2 -
    (2 / 3) * N2 +
    (5 / 16) * N3 +
    (41 / 180) * N4 -
    (127 / 288) * N5 +
    (7891 / 37800) * N6,
  (13 / 48) * N2 -
    (3 / 5) * N3 +
    (557 / 1440) * N4 +
    (281 / 630) * N5 -
    (1983433 / 1935360) * N6,
  (61 / 240) * N3 -
    (103 / 140) * N4 +
    (15061 / 26880) * N5 +
    (167603 / 181440) * N6,
  (49561 / 161280) * N4 - (179 / 168) * N5 + (6601661 / 7257600) * N6,
  (34729 / 80640) * N5 - (3418889 / 1995840) * N6,
  (212378941 / 319334400) * N6,
];

// 8° bands from 80°S; X is stretched to 12° so it reaches 84°N
const LAT_BANDS = 'CDEFGHJKLMNPQRSTUVWXX';

export interface Utm {
  zone: number;
  band: string;
  easting: number;
  northing: number;
}

function zoneFor(lng: number, band: string): number {
  // lng 180 belongs to zone 60, not a 61st
  let zone = Math.min(Math.floor((lng + 180) / 6) + 1, 60);
  // south-west Norway widens zone 32 over the west of zone 31
  if (band === 'V' && zone === 31 && lng >= 3) zone = 32;
  // Svalbard uses only zones 31, 33, 35 and 37 (each 12° wide)
  if (band === 'X' && (zone === 32 || zone === 34 || zone === 36)) {
    const edge = (zone - 1) * 6 - 180 + 3;
    zone += lng < edge ? -1 : 1;
  }
  return zone;
}

export function toUtm(lat: number, lng: number): Utm | null {
  if (lat < UTM_MIN_LAT || lat > UTM_MAX_LAT) return null;
  if (lng < -180 || lng > 180) return null;

  const band = LAT_BANDS.charAt(Math.floor(lat / 8 + 10));
  const zone = zoneFor(lng, band);
  const centralMeridian = (zone - 1) * 6 - 180 + 3;

  const phi = (lat * Math.PI) / 180;
  const lambda = ((lng - centralMeridian) * Math.PI) / 180;
  const cosLambda = Math.cos(lambda);

  // conformal latitude
  const tau = Math.tan(phi);
  const sigma = Math.sinh(E * Math.atanh((E * tau) / Math.sqrt(1 + tau * tau)));
  const tauPrime =
    tau * Math.sqrt(1 + sigma * sigma) - sigma * Math.sqrt(1 + tau * tau);

  // spherical transverse Mercator, then Krüger's correction to the ellipsoid
  const xiPrime = Math.atan2(tauPrime, cosLambda);
  const etaPrime = Math.asinh(
    Math.sin(lambda) / Math.sqrt(tauPrime * tauPrime + cosLambda * cosLambda),
  );
  let xi = xiPrime;
  let eta = etaPrime;
  for (let j = 1; j <= ALPHA.length; j++) {
    const alpha = ALPHA[j - 1];
    xi += alpha * Math.sin(2 * j * xiPrime) * Math.cosh(2 * j * etaPrime);
    eta += alpha * Math.cos(2 * j * xiPrime) * Math.sinh(2 * j * etaPrime);
  }

  const easting = K0_A * eta + FALSE_EASTING;
  const northing = K0_A * xi + (lat < 0 ? FALSE_NORTHING : 0);
  return { zone, band, easting, northing };
}

// 17T 589139 4477813, rounded to the metre
export function formatUtm(utm: Utm): string {
  return `${utm.zone}${utm.band} ${Math.round(utm.easting)} ${Math.round(utm.northing)}`;
}

// 100 km square letters: columns cycle every 3 zones, rows every 2
const E100K = ['ABCDEFGH', 'JKLMNPQR', 'STUVWXYZ'];
const N100K = ['ABCDEFGHJKLMNPQRSTUV', 'FGHJKLMNPQRSTUVABCDE'];

// 17T NE 89138 77812 — 1 m precision. MGRS truncates rather than rounds, so
// the reference names the south-west corner of the square holding the point
export function formatMgrs(utm: Utm): string {
  // drop float noise below a nanometre so 99999.9999999999 m stays in its square
  const easting = Number(utm.easting.toFixed(6));
  const northing = Number(utm.northing.toFixed(6));
  const column = Math.floor(easting / 100_000);
  const row = Math.floor(northing / 100_000) % 20;
  const square =
    E100K[(utm.zone - 1) % 3].charAt(column - 1) +
    N100K[(utm.zone - 1) % 2].charAt(row);
  const e = String(Math.floor(easting % 100_000)).padStart(5, '0');
  const n = String(Math.floor(northing % 100_000)).padStart(5, '0');
  return `${utm.zone}${utm.band} ${square} ${e} ${n}`;
}
