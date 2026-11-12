// helpers for rendering dates against a fixed UTC offset (in hours).
// the app historically hardcoded UTC+8; these utilities let the value come
// from a user preference while keeping the same output shape.

// clamp to the real-world range of named offsets (UTC-12 .. UTC+14).
export const MIN_TIMEZONE_OFFSET = -12;
export const MAX_TIMEZONE_OFFSET = 14;

export const DEFAULT_TIMEZONE_OFFSET = 8;
export type TimezoneMode = 'fixed' | 'system';

export const isValidTimezoneOffset = (value: number): boolean =>
  Number.isFinite(value) &&
  Number.isInteger(value * 4) &&
  value >= MIN_TIMEZONE_OFFSET &&
  value <= MAX_TIMEZONE_OFFSET;

// format a `+HH:MM` / `-HH:MM` suffix for an offset given in hours.
export const formatOffsetSuffix = (offsetHours: number): string => {
  const sign = offsetHours < 0 ? '-' : '+';
  const totalMinutes = Math.round(Math.abs(offsetHours) * 60);
  const hh = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const mm = String(totalMinutes % 60).padStart(2, '0');
  return `${sign}${hh}:${mm}`;
};

// short human label, keeping whole-hour labels compact while showing minutes.
export const formatOffsetLabel = (offsetHours: number): string => {
  const totalMinutes = Math.round(Math.abs(offsetHours) * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const sign = offsetHours >= 0 ? '+' : '-';
  return `UTC${sign}${hours}${minutes ? `:${String(minutes).padStart(2, '0')}` : ''}`;
};

// shift a UTC date by the offset so the wall-clock reads as the target zone.
export const shiftDateToOffset = (date: Date, offsetHours: number): Date =>
  new Date(date.getTime() + offsetHours * 60 * 60 * 1000);

// render an offset date as RFC 3339 with the proper `+HH:MM` suffix instead
// of the trailing `Z`.
export const toOffsetISOString = (date: Date, offsetHours: number): string =>
  shiftDateToOffset(date, offsetHours)
    .toISOString()
    .replace('Z', formatOffsetSuffix(offsetHours));

// a `::tz=` override: either a fixed offset or an IANA zone whose offset
// depends on the instant (DST).
export type TimezoneSpec =
  | { kind: 'fixed'; offsetHours: number }
  | { kind: 'iana'; timeZone: string };

const NUMERIC_OFFSET_PATTERN =
  /^(?:utc|gmt)?\s*([+-])?\s*(\d{1,2})(?:(?::?(\d{2}))|(\.\d+))?$/i;

const normalizeZoneKey = (value: string): string =>
  value.toLowerCase().replace(/[\s_-]+/g, '');

// city (last IANA segment, normalized) -> canonical IANA id. built lazily on
// the first named lookup; ~420 entries.
let cityIndex: Map<string, string> | null = null;

const getCityIndex = (): Map<string, string> => {
  if (cityIndex) return cityIndex;
  const index = new Map<string, string>();
  const zones =
    typeof Intl.supportedValuesOf === 'function'
      ? Intl.supportedValuesOf('timeZone')
      : [];
  for (const zone of zones) {
    const city = zone.slice(zone.lastIndexOf('/') + 1);
    const key = normalizeZoneKey(city);
    if (!index.has(key)) index.set(key, zone);
  }
  cityIndex = index;
  return index;
};

const canonicalTimeZone = (value: string): string | null => {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: value,
    }).resolvedOptions().timeZone;
  } catch {
    return null;
  }
};

// parses `0`, `8`, `-8`, `+5:30`, `+0530`, `5.5`, `UTC+8`, `Z`, an IANA id
// (`Asia/Taipei`) or a city name (`taipei`, `new york`).
export const parseTimezoneSpec = (raw: string): TimezoneSpec | null => {
  const value = raw.trim();
  if (value === '') return null;
  if (/^(?:z|utc|gmt)$/i.test(value)) return { kind: 'fixed', offsetHours: 0 };

  const numeric = NUMERIC_OFFSET_PATTERN.exec(value);
  if (numeric) {
    const [, sign, hourText, minuteText, fraction] = numeric;
    const minutes = minuteText === undefined ? 0 : Number(minuteText);
    if (minutes > 59) return null;
    const magnitude =
      Number(hourText) + minutes / 60 + (fraction ? Number(fraction) : 0);
    const offsetHours = sign === '-' ? -magnitude : magnitude;
    return isValidTimezoneOffset(offsetHours)
      ? { kind: 'fixed', offsetHours: offsetHours === 0 ? 0 : offsetHours }
      : null;
  }

  if (value.includes('/')) {
    const zone = canonicalTimeZone(value);
    return zone ? { kind: 'iana', timeZone: zone } : null;
  }

  const zone = getCityIndex().get(normalizeZoneKey(value));
  return zone ? { kind: 'iana', timeZone: zone } : null;
};

const offsetFormatters = new Map<string, Intl.DateTimeFormat>();

// UTC offset (hours) of an IANA zone at the given instant.
export const offsetInTimeZone = (timeZone: string, date: Date): number => {
  let formatter = offsetFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'longOffset',
    });
    offsetFormatters.set(timeZone, formatter);
  }
  const name =
    formatter.formatToParts(date).find((part) => part.type === 'timeZoneName')
      ?.value ?? 'GMT';
  const match = /^GMT([+-])(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(name);
  if (!match) return 0;
  const magnitude =
    Number(match[2]) + Number(match[3]) / 60 + Number(match[4] ?? 0) / 3600;
  return match[1] === '-' ? -magnitude : magnitude;
};

export const offsetForSpec = (spec: TimezoneSpec, date: Date): number =>
  spec.kind === 'fixed'
    ? spec.offsetHours
    : offsetInTimeZone(spec.timeZone, date);
