// helpers for rendering dates against a fixed UTC offset (in hours).
// the app historically hardcoded UTC+8; these utilities let the value come
// from a user preference while keeping the same output shape.

// clamp to the real-world range of named offsets (UTC-12 .. UTC+14).
export const MIN_TIMEZONE_OFFSET = -12;
export const MAX_TIMEZONE_OFFSET = 14;

export const DEFAULT_TIMEZONE_OFFSET = 8;

export const isValidTimezoneOffset = (value: number): boolean =>
  Number.isInteger(value) &&
  value >= MIN_TIMEZONE_OFFSET &&
  value <= MAX_TIMEZONE_OFFSET;

// format a `+HH:MM` / `-HH:MM` suffix for an offset given in hours.
export const formatOffsetSuffix = (offsetHours: number): string => {
  const sign = offsetHours < 0 ? '-' : '+';
  const abs = Math.abs(offsetHours);
  const hh = String(Math.trunc(abs)).padStart(2, '0');
  const mm = String(Math.round((abs - Math.trunc(abs)) * 60)).padStart(2, '0');
  return `${sign}${hh}:${mm}`;
};

// short human label, e.g. `UTC+8` or `UTC-3`.
export const formatOffsetLabel = (offsetHours: number): string =>
  `UTC${offsetHours >= 0 ? '+' : '-'}${Math.abs(offsetHours)}`;

// shift a UTC date by the offset so the wall-clock reads as the target zone.
export const shiftDateToOffset = (date: Date, offsetHours: number): Date =>
  new Date(date.getTime() + offsetHours * 60 * 60 * 1000);

// render an offset date as RFC 3339 with the proper `+HH:MM` suffix instead
// of the trailing `Z`.
export const toOffsetISOString = (date: Date, offsetHours: number): string =>
  shiftDateToOffset(date, offsetHours)
    .toISOString()
    .replace('Z', formatOffsetSuffix(offsetHours));
