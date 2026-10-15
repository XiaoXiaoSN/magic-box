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
