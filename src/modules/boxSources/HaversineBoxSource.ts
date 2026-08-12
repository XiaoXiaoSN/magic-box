import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// mean earth radius per IUGG
const EARTH_RADIUS_KM = 6371.0088;
const KM_TO_MILES = 0.621371;
const KM_TO_NM = 1 / 1.852;

// coordinate separators: ' to ', ';', '|'
const PAIR_SEP = /\s+to\s+|;|\|/i;

interface Coord {
  lat: number;
  lng: number;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** formats a display string for the coordinate */
function formatCoord(c: Coord): string {
  return `${c.lat}, ${c.lng}`;
}

/** parses "lat,lng" and validates ranges; returns null if invalid */
function parseCoord(s: string): Coord | null {
  const parts = s.split(',');
  if (parts.length !== 2) return null;
  const lat = Number.parseFloat(parts[0].trim());
  const lng = Number.parseFloat(parts[1].trim());
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  if (lat < -90 || lat > 90) return null;
  if (lng < -180 || lng > 180) return null;
  return { lat, lng };
}

/** haversine great-circle distance in km */
function haversineKm(a: Coord, b: Coord): number {
  const φ1 = toRad(a.lat);
  const φ2 = toRad(b.lat);
  const dφ = toRad(b.lat - a.lat);
  const dλ = toRad(b.lng - a.lng);
  const sinDφ = Math.sin(dφ / 2);
  const sinDλ = Math.sin(dλ / 2);
  const val = sinDφ * sinDφ + Math.cos(φ1) * Math.cos(φ2) * sinDλ * sinDλ;
  const c = 2 * Math.atan2(Math.sqrt(val), Math.sqrt(1 - val));
  return EARTH_RADIUS_KM * c;
}

/** initial bearing (forward azimuth) in degrees 0..360 */
function initialBearing(a: Coord, b: Coord): number {
  const φ1 = toRad(a.lat);
  const φ2 = toRad(b.lat);
  const dλ = toRad(b.lng - a.lng);
  const y = Math.sin(dλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(dλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** renders key-value record as plaintext for headless consumers */
function kvToPlaintext(kv: Record<string, string>): string {
  return Object.entries(kv)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

const FORMAT_ERROR_BOX_NAME = 'Distance';
const FORMAT_ERROR_MSG =
  'Invalid input. Expected format: lat1,lng1 to lat2,lng2\n' +
  'Latitude must be -90..90, longitude must be -180..180.';

export const HaversineBoxSource = {
  defaultDisabled: true,
  name: 'Distance',
  description:
    'Great-circle distance between two coordinates. Input: "lat1,lng1 to lat2,lng2".',
  defaultInput: '40.7128,-74.0060 to 51.5074,-0.1278 ::haversine',
  tag: '#',
  kind: 'Calculate',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'haversine', 'distance')) return [];

    const raw = trim(input);
    if (raw.length > 100) {
      return [
        new BoxBuilder(FORMAT_ERROR_BOX_NAME, FORMAT_ERROR_MSG)
          .setTemplate(KeyValueBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const parts = raw.split(PAIR_SEP);
    if (parts.length !== 2) {
      return [
        new BoxBuilder(FORMAT_ERROR_BOX_NAME, FORMAT_ERROR_MSG)
          .setTemplate(KeyValueBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const coordA = parseCoord(parts[0]);
    const coordB = parseCoord(parts[1]);

    if (!coordA || !coordB) {
      return [
        new BoxBuilder(FORMAT_ERROR_BOX_NAME, FORMAT_ERROR_MSG)
          .setTemplate(KeyValueBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const km = haversineKm(coordA, coordB);
    const miles = km * KM_TO_MILES;
    const nm = km * KM_TO_NM;
    const bearing = initialBearing(coordA, coordB);

    // integer-exact for zero distance; otherwise 3 decimals
    const fmtDist = (n: number): string => (n === 0 ? '0' : n.toFixed(3));

    const kv: Record<string, string> = {
      From: formatCoord(coordA),
      To: formatCoord(coordB),
      Kilometers: fmtDist(km),
      Miles: fmtDist(miles),
      'Nautical Miles': fmtDist(nm),
      'Initial Bearing': `${bearing.toFixed(1)}°`,
    };

    return [
      new BoxBuilder(FORMAT_ERROR_BOX_NAME, kvToPlaintext(kv))
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(kv)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default HaversineBoxSource;
