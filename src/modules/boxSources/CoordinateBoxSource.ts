import {
  type Angle,
  type Axis,
  angleLimit,
  formatDdm,
  formatDecimal,
  formatDms,
  type LatLng,
  parseCoordinate,
} from '@functions/geo/angle';
import {
  decodeGeohash,
  encodeGeohash,
  isGeohash,
} from '@functions/geo/geohash';
import {
  decodePlusCode,
  encodePlusCode,
  isFullPlusCode,
  isValidPlusCode,
} from '@functions/geo/plusCode';
import { formatMgrs, formatUtm, toUtm, type Utm } from '@functions/geo/utm';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, errorBox, hasOptionKeys, keyValueBox } from '@modules/Box';

const Priority = 10;
const BoxName = 'Coordinates';

// coordinates are short; the cap bounds the pair search in parseCoordinate
const MAX_INPUT_LENGTH = 100;

// options that show every format
const TRIGGER_KEYS = ['coord', 'coords', 'latlng', 'latlon'];

const USAGE = [
  'Expected a coordinate, e.g.',
  '40.446195, -79.948862',
  `40°26'46.3"N 79°56'55.9"W`,
  '87G2C3W2+FF (Plus Code)',
  'dppnhep00 (Geohash)',
].join('\n');

// what the input decoded to. a code is echoed back as typed rather than
// re-encoded, which could change its length
interface Point {
  latLng: LatLng;
  plusCode?: string;
  geohash?: string;
}

type Value = string | { error: string };

interface CoordinateFormat {
  label: string;
  // option keys that select only this format
  keys: string[];
  // a single angle may be a latitude or a longitude, so only the angle
  // formats apply to it; the grid systems need both
  single?: (angle: Angle) => string;
  pair: (point: Point) => Value;
}

const needsPair = (label: string): Value => ({
  error: `${label} needs a latitude and a longitude, e.g. 40.446195, -79.948862`,
});

function utmOrError(point: Point, format: (utm: Utm) => string): Value {
  const utm = toUtm(point.latLng.lat, point.latLng.lng);
  if (!utm) return { error: 'UTM and MGRS cover latitudes from 80°S to 84°N' };
  return format(utm);
}

const FORMATS: CoordinateFormat[] = [
  {
    label: 'Decimal',
    keys: ['dd', 'decimal'],
    single: (angle) => formatDecimal(angle.value),
    pair: ({ latLng }) =>
      `${formatDecimal(latLng.lat)}, ${formatDecimal(latLng.lng)}`,
  },
  {
    label: 'DDM',
    keys: ['ddm'],
    single: (angle) => formatDdm(angle.value, angle.axis),
    pair: ({ latLng }) =>
      `${formatDdm(latLng.lat, 'lat')} ${formatDdm(latLng.lng, 'lng')}`,
  },
  {
    label: 'DMS',
    keys: ['dms'],
    single: (angle) => formatDms(angle.value, angle.axis),
    pair: ({ latLng }) =>
      `${formatDms(latLng.lat, 'lat')} ${formatDms(latLng.lng, 'lng')}`,
  },
  {
    label: 'Plus Code',
    keys: ['pluscode', 'olc'],
    pair: ({ latLng, plusCode }) =>
      plusCode ?? encodePlusCode(latLng.lat, latLng.lng),
  },
  {
    label: 'Geohash',
    keys: ['geohash'],
    pair: ({ latLng, geohash }) =>
      geohash ?? encodeGeohash(latLng.lat, latLng.lng),
  },
  {
    label: 'UTM',
    keys: ['utm'],
    pair: (point) => utmOrError(point, formatUtm),
  },
  {
    label: 'MGRS',
    keys: ['mgrs'],
    pair: (point) => utmOrError(point, formatMgrs),
  },
  {
    label: 'geo URI',
    keys: ['geo', 'geouri'],
    pair: ({ latLng }) =>
      `geo:${formatDecimal(latLng.lat)},${formatDecimal(latLng.lng)}`,
  },
];

const FORMAT_KEYS = FORMATS.flatMap((f) => f.keys);

const AXIS_NAMES = { lat: 'Latitude', lng: 'Longitude' } as const;

function rangeError(axis: Axis | null): string {
  const limit = angleLimit(axis);
  const name = axis ? AXIS_NAMES[axis] : 'An angle';
  return `${name} must be between -${limit} and ${limit} degrees.`;
}

type Parsed =
  | { kind: 'single'; angle: Angle }
  | { kind: 'pair'; point: Point }
  | { kind: 'error'; message: string };

function parse(raw: string): Parsed {
  const coordinate = parseCoordinate(raw);
  if (coordinate?.kind === 'single') {
    const { angle } = coordinate;
    if (Math.abs(angle.value) > angleLimit(angle.axis)) {
      return { kind: 'error', message: rangeError(angle.axis) };
    }
    return coordinate;
  }
  if (coordinate?.kind === 'pair') {
    const lat = coordinate.lat.value;
    const lng = coordinate.lng.value;
    if (Math.abs(lat) > angleLimit('lat')) {
      return { kind: 'error', message: rangeError('lat') };
    }
    if (Math.abs(lng) > angleLimit('lng')) {
      return { kind: 'error', message: rangeError('lng') };
    }
    return { kind: 'pair', point: { latLng: { lat, lng } } };
  }

  const upper = raw.toUpperCase();
  if (isFullPlusCode(upper)) {
    const area = decodePlusCode(upper);
    if (area) {
      const latLng = { lat: area.lat, lng: area.lng };
      return { kind: 'pair', point: { latLng, plusCode: upper } };
    }
  }
  if (isValidPlusCode(upper)) {
    return {
      kind: 'error',
      message:
        'A short Plus Code needs a reference location. Use the full code, e.g. 87G2C3W2+FF.',
    };
  }

  if (isGeohash(raw)) {
    const latLng = decodeGeohash(raw);
    const geohash = raw.toLowerCase();
    if (latLng) return { kind: 'pair', point: { latLng, geohash } };
  }

  return { kind: 'error', message: USAGE };
}

function formatValue(format: CoordinateFormat, parsed: Parsed): Value {
  if (parsed.kind === 'pair') return format.pair(parsed.point);
  if (parsed.kind === 'single' && format.single) {
    return format.single(parsed.angle);
  }
  return needsPair(format.label);
}

export const CoordinateBoxSource = {
  defaultDisabled: true,
  name: BoxName,
  description:
    'Convert a coordinate between decimal degrees, DDM, DMS, Plus Code, Geohash, UTM, MGRS and geo URI. ::coord shows every format; ::dms, ::pluscode, ::geohash, ::utm, … show just that one. Accepts lat/lng in any of the angle formats, a full Plus Code or a Geohash.',
  defaultInput: '40.446195, -79.948862\n::coord',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, ...TRIGGER_KEYS, ...FORMAT_KEYS)) return [];

    const raw = trim(input);
    if (!raw || raw.length > MAX_INPUT_LENGTH) return [];

    const parsed = parse(raw);
    if (parsed.kind === 'error') {
      return [errorBox(BoxName, parsed.message, { priority: this.priority })];
    }

    const selected = FORMATS.filter((f) => hasOptionKeys(options, ...f.keys));
    if (selected.length === 0) {
      // the full table skips what does not apply instead of listing errors
      const rows: Record<string, string> = {};
      for (const format of FORMATS) {
        const value = formatValue(format, parsed);
        if (typeof value === 'string') rows[format.label] = value;
      }
      return [
        keyValueBox('keyValue', BoxName, rows, {
          priority: this.priority,
        }),
      ];
    }

    // one box per requested format so its copy button yields the bare value
    return selected.map((format) => {
      const value = formatValue(format, parsed);
      if (typeof value !== 'string') {
        return errorBox(format.label, value.error, { priority: this.priority });
      }
      return new BoxBuilder(format.label, value)
        .setView('default')
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build();
    });
  },
};

export default CoordinateBoxSource;
