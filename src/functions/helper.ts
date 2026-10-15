import { normalizeBase64 } from './base64';

export function isNumeric(num: unknown): boolean {
  if (typeof num === 'number') return Number.isFinite(num);
  return (
    typeof num === 'string' &&
    num.trim() !== '' &&
    /^[+-]?\d+(\.\d*)?$/.test(num) &&
    Number.isFinite(Number(num))
  );
}

export function toNumeric(num: unknown): number | null {
  return isNumeric(num) ? Number(num) : null;
}

export function isString(variable: unknown): boolean {
  return typeof variable === 'string' || variable instanceof String;
}

export function isArray(variable: unknown): boolean {
  return Array.isArray(variable);
}

export function isObject(variable: unknown): boolean {
  return typeof variable === 'object' && variable !== null;
}

export function trim(str: string): string {
  return str.replace(/^\s+|\s+$/g, '');
}

export function isRFC3339(str: unknown): boolean {
  if (!isString(str)) return false;

  const match =
    /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):([0-5]\d):([0-5]\d)(\.\d+)?([Zz]|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/i.exec(
      str as string,
    );
  return (
    match !== null &&
    isValidCalendarDate(Number(match[1]), Number(match[2]), Number(match[3]))
  );
}

export function isBase64(str: string): boolean {
  // keep ordinary prose from matching when missing padding is allowed
  if (str.includes(' ') && !str.includes('=')) return false;
  try {
    normalizeBase64(str);
    return true;
  } catch {
    return false;
  }
}

export function isJSON(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

const DAYS_IN_MONTH = [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const MONTH_MAP: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

const MONTH_NAMES_PATTERN =
  '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const ORDINAL_SUFFIX = '(?:st|n[d]|rd|th)?';
const NAMED_YMD_REGEX = new RegExp(
  `^(\\d{4})([-/])${MONTH_NAMES_PATTERN}\\2(\\d{1,2})(.*)$`,
  'i',
);
const MONTH_DAY_YEAR_REGEX = new RegExp(
  `^${MONTH_NAMES_PATTERN}[-/.,\\s]+(\\d{1,2})${ORDINAL_SUFFIX}(?:[-/.,\\s]+(\\d{2,4}))?(.*)$`,
  'i',
);
const DAY_MONTH_YEAR_REGEX = new RegExp(
  `^(\\d{1,2})${ORDINAL_SUFFIX}[-/.,\\s]+(?:of\\s+)?${MONTH_NAMES_PATTERN}(?:[-/.,\\s]+(\\d{2,4}))?(.*)$`,
  'i',
);

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

export function isValidCalendarDate(
  year: number,
  month: number,
  day: number,
): boolean {
  return (
    Number.isInteger(year) &&
    year >= 1 &&
    year <= 9999 &&
    Number.isInteger(month) &&
    month >= 1 &&
    month <= 12 &&
    Number.isInteger(day) &&
    day >= 1 &&
    day <= (month === 2 ? (isLeapYear(year) ? 29 : 28) : DAYS_IN_MONTH[month])
  );
}

export function isValidDay(month: number, day: number): boolean {
  return (
    Number.isInteger(month) &&
    month >= 1 &&
    month <= 12 &&
    Number.isInteger(day) &&
    day >= 1 &&
    day <= DAYS_IN_MONTH[month]
  );
}

function isValidDateSuffix(suffix: string): boolean {
  if (suffix.trim() === '') return true;
  return /^(?:T|\s)([01]\d|2[0-3]):([0-5]\d):([0-5]\d)(?:\.\d+)?([Zz]|[+-](?:[01]\d|2[0-3])(?::?[0-5]\d)?)?$/i.test(
    suffix,
  );
}

function yearFromTwoOrFourDigits(year: number): number {
  if (year >= 100) return year;
  return year > 50 ? 1900 + year : 2000 + year;
}

function validParsedDate(
  year: number | undefined,
  month: number,
  day: number,
): { year?: number; month: number; day: number } | null {
  if (year === undefined) return isValidDay(month, day) ? { month, day } : null;
  return isValidCalendarDate(year, month, day) ? { year, month, day } : null;
}

function parseTimestampDate(
  value: string,
): { year?: number; month: number; day: number } | null {
  const timestamp = Number(value);
  const date = new Date(value.length <= 11 ? timestamp * 1000 : timestamp);
  if (!Number.isFinite(date.getTime())) return null;

  return validParsedDate(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
  );
}

export function parseDateString(
  input: string,
): { year?: number; month: number; day: number } | null {
  const cleaned = trim(input);
  if (!cleaned) return null;

  const compactDate = /^(\d{4})(\d{2})(\d{2})$/.exec(cleaned);
  if (compactDate) {
    return validParsedDate(
      Number(compactDate[1]),
      Number(compactDate[2]),
      Number(compactDate[3]),
    );
  }

  if (/^\d{9,13}$/.test(cleaned)) return parseTimestampDate(cleaned);

  // YYYY-MM-DD, YYYY/MM/DD, and YYYY.MM.DD with an optional validated time.
  const ymdMatch = /^(\d{4})([-/.])(\d{1,2})\2(\d{1,2})(.*)$/.exec(cleaned);
  if (ymdMatch) {
    if (!isValidDateSuffix(ymdMatch[5])) return null;
    return validParsedDate(
      Number(ymdMatch[1]),
      Number(ymdMatch[3]),
      Number(ymdMatch[4]),
    );
  }

  const namedYmd = NAMED_YMD_REGEX.exec(cleaned);
  if (namedYmd) {
    if (!isValidDateSuffix(namedYmd[5])) return null;
    return validParsedDate(
      Number(namedYmd[1]),
      MONTH_MAP[namedYmd[3].toLowerCase()],
      Number(namedYmd[4]),
    );
  }

  const chineseDate = /^(\d{4})年(\d{1,2})月(\d{1,2})日?(.*)$/.exec(cleaned);
  if (chineseDate) {
    if (!isValidDateSuffix(chineseDate[4])) return null;
    return validParsedDate(
      Number(chineseDate[1]),
      Number(chineseDate[2]),
      Number(chineseDate[3]),
    );
  }

  const numericDate = /^(\d{1,2})([-/.])(\d{1,2})\2(\d{2,4})(.*)$/.exec(
    cleaned,
  );
  if (numericDate) {
    if (!isValidDateSuffix(numericDate[5])) return null;
    let month = Number(numericDate[1]);
    let day = Number(numericDate[3]);
    if (month > 12 && day <= 12) [month, day] = [day, month];
    return validParsedDate(
      yearFromTwoOrFourDigits(Number(numericDate[4])),
      month,
      day,
    );
  }

  const monthDayYear = MONTH_DAY_YEAR_REGEX.exec(cleaned);
  if (monthDayYear) {
    if (!isValidDateSuffix(monthDayYear[4])) return null;
    return validParsedDate(
      monthDayYear[3]
        ? yearFromTwoOrFourDigits(Number(monthDayYear[3]))
        : undefined,
      MONTH_MAP[monthDayYear[1].toLowerCase()],
      Number(monthDayYear[2]),
    );
  }

  const dayMonthYear = DAY_MONTH_YEAR_REGEX.exec(cleaned);
  if (dayMonthYear) {
    if (!isValidDateSuffix(dayMonthYear[4])) return null;
    return validParsedDate(
      dayMonthYear[3]
        ? yearFromTwoOrFourDigits(Number(dayMonthYear[3]))
        : undefined,
      MONTH_MAP[dayMonthYear[2].toLowerCase()],
      Number(dayMonthYear[1]),
    );
  }

  const numericMonthDay = /^(\d{1,2})[-/.](\d{1,2})$/.exec(cleaned);
  if (numericMonthDay) {
    return validParsedDate(
      undefined,
      Number(numericMonthDay[1]),
      Number(numericMonthDay[2]),
    );
  }

  const chineseMonthDay = /^(\d{1,2})月(\d{1,2})日?$/.exec(cleaned);
  if (chineseMonthDay) {
    return validParsedDate(
      undefined,
      Number(chineseMonthDay[1]),
      Number(chineseMonthDay[2]),
    );
  }

  // Keep the previously accepted weekday form without relying on engine parsing.
  const weekdayDate = /^(sun|mon|tue|wed|thu|fri|sat)\w*\s+(.+)$/i.exec(
    cleaned,
  );
  if (weekdayDate) {
    const parsed = parseDateString(weekdayDate[2]);
    if (parsed?.year === undefined) return null;
    const date = new Date(0);
    date.setUTCFullYear(parsed.year, parsed.month - 1, parsed.day);
    date.setUTCHours(0, 0, 0, 0);
    const weekday = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][
      date.getUTCDay()
    ];
    if (weekday !== weekdayDate[1].slice(0, 3).toLowerCase()) return null;
    return parsed;
  }

  return null;
}

export const helper = {
  isNumeric,
  toNumeric,
  isString,
  isArray,
  isObject,
  trim,
  isRFC3339,
  isBase64,
  isJSON,
  isValidDay,
  isValidCalendarDate,
  parseDateString,
};
