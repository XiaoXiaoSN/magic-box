// parse and format angles written as decimal degrees (DD), degrees and
// decimal minutes (DDM) or degrees, minutes and seconds (DMS).

export type Axis = 'lat' | 'lng';

export interface Angle {
  // signed decimal degrees; south and west are negative
  value: number;
  // set when a hemisphere letter pins the angle to an axis
  axis: Axis | null;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export type ParsedCoordinate =
  | { kind: 'pair'; lat: Angle; lng: Angle }
  | { kind: 'single'; angle: Angle };

const HEMISPHERES: Record<string, { axis: Axis; sign: 1 | -1 }> = {
  N: { axis: 'lat', sign: 1 },
  S: { axis: 'lat', sign: -1 },
  E: { axis: 'lng', sign: 1 },
  W: { axis: 'lng', sign: -1 },
};

// the mark allowed after the degrees, minutes and seconds number, in order.
// ASCII ' and " are what people type; the rest come from pasted text
const DEGREE_MARK = /^(?:[°º˚:]?)$/;
const MINUTE_MARK = /^(?:['′’:]?)$/;
const SECOND_MARK = /^(?:["″”]|''|′′|’’)?$/;
const MARKS = [DEGREE_MARK, MINUTE_MARK, SECOND_MARK];

// one number and its optional unit mark; sticky so the parts must tile the
// whole string, and free of nested quantifiers so it runs in linear time
const PART_RE = /(\d+(?:\.\d+)?)\s*([°º˚'′’"″”:]*)\s*/y;

export function parseAngle(text: string): Angle | null {
  let rest = text.trim();

  let hemisphere: (typeof HEMISPHERES)[string] | undefined;
  const lead = HEMISPHERES[rest.charAt(0).toUpperCase()];
  const trail = HEMISPHERES[rest.charAt(rest.length - 1).toUpperCase()];
  if (lead) {
    hemisphere = lead;
    rest = rest.slice(1).trimStart();
  } else if (trail) {
    hemisphere = trail;
    rest = rest.slice(0, -1).trimEnd();
  }

  let sign = 1;
  if (rest.startsWith('-') || rest.startsWith('+')) {
    // "-40°N" contradicts itself; refuse rather than pick one
    if (rest.startsWith('-') && hemisphere) return null;
    if (rest.startsWith('-')) sign = -1;
    rest = rest.slice(1).trimStart();
  }
  if (hemisphere) sign = hemisphere.sign;

  const parts: string[] = [];
  PART_RE.lastIndex = 0;
  while (PART_RE.lastIndex < rest.length) {
    const index = parts.length;
    const match = PART_RE.exec(rest);
    if (!match || index >= MARKS.length || !MARKS[index].test(match[2])) {
      return null;
    }
    parts.push(match[1]);
  }
  if (parts.length === 0) return null;

  // only the last part may carry a fraction: 40.5°30' is not an angle
  if (parts.slice(0, -1).some((p) => p.includes('.'))) return null;

  const [degrees, minutes = 0, seconds = 0] = parts.map(Number);
  if (minutes >= 60 || seconds >= 60) return null;

  return {
    value: sign * (degrees + minutes / 60 + seconds / 3600),
    axis: hemisphere?.axis ?? null,
  };
}

function toPair(a: Angle, b: Angle): ParsedCoordinate | null {
  // latitude first unless the hemisphere letters say otherwise
  const [lat, lng] = a.axis === 'lng' || b.axis === 'lat' ? [b, a] : [a, b];
  if (lat.axis === 'lng' || lng.axis === 'lat') return null;
  return { kind: 'pair', lat, lng };
}

// reads one angle or a latitude/longitude pair. a pair is split on a comma
// when there is one; otherwise on whitespace, at the one place where both
// halves read as angles. "40 30" stays a single 40°30' — write "40, 30" for
// the pair
export function parseCoordinate(text: string): ParsedCoordinate | null {
  const trimmed = text.trim();
  if (trimmed.length === 0) return null;

  if (trimmed.includes(',')) {
    const halves = trimmed.split(',');
    if (halves.length !== 2) return null;
    const a = parseAngle(halves[0]);
    const b = parseAngle(halves[1]);
    return a && b ? toPair(a, b) : null;
  }

  const single = parseAngle(trimmed);
  if (single) return { kind: 'single', angle: single };

  const words = trimmed.split(/\s+/);
  let found: ParsedCoordinate | null = null;
  for (let i = 1; i < words.length; i++) {
    const a = parseAngle(words.slice(0, i).join(' '));
    const b = a && parseAngle(words.slice(i).join(' '));
    const pair = a && b ? toPair(a, b) : null;
    if (!pair) continue;
    // two readings of the same text: refuse to guess
    if (found) return null;
    found = pair;
  }
  return found;
}

export function angleLimit(axis: Axis | null): number {
  return axis === 'lat' ? 90 : 180;
}

// up to 6 decimals (~0.1 m), trailing zeros dropped
export function formatDecimal(value: number): string {
  return String(Number(value.toFixed(6)));
}

function hemisphereLetter(negative: boolean, axis: Axis | null): string {
  if (axis === 'lat') return negative ? 'S' : 'N';
  if (axis === 'lng') return negative ? 'W' : 'E';
  return '';
}

function withHemisphere(
  body: string,
  value: number,
  units: number,
  axis: Axis | null,
): string {
  // an angle that rounds to zero prints unsigned, never as -0°0'0.00"
  const negative = value < 0 && units > 0;
  if (axis) return `${body}${hemisphereLetter(negative, axis)}`;
  return negative ? `-${body}` : body;
}

// both formatters round once, in whole units of the last printed digit, so
// 59.999" carries into the minutes instead of printing as 60.00"

// 40°26.7717'N
export function formatDdm(value: number, axis: Axis | null): string {
  const perDegree = 60 * 10_000;
  const units = Math.round(Math.abs(value) * perDegree);
  const degrees = Math.floor(units / perDegree);
  const minutes = ((units % perDegree) / 10_000).toFixed(4);
  return withHemisphere(`${degrees}°${minutes}'`, value, units, axis);
}

// 40°26'46.30"N
export function formatDms(value: number, axis: Axis | null): string {
  const perDegree = 3600 * 100;
  const units = Math.round(Math.abs(value) * perDegree);
  const degrees = Math.floor(units / perDegree);
  const minutes = Math.floor((units % perDegree) / 6000);
  const seconds = ((units % 6000) / 100).toFixed(2);
  return withHemisphere(
    `${degrees}°${minutes}'${seconds}"`,
    value,
    units,
    axis,
  );
}
