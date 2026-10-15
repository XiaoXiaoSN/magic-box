import { isString, parseDateString, trim } from '@functions/helper';
import { getLocale, getTimezoneOffset } from '@functions/runtimePrefs';
import { shiftDateToOffset, toOffsetISOString } from '@functions/timezone';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const PriorityDateCalculate = 10;
const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const MONTH_NAMES =
  '(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)';
const ORDINAL_SUFFIX = '(?:st|n[d]|rd|th)?';
const DATE_SHAPE = [
  '(?:now|today|tomorrow|yesterday)',
  '\\d{8}',
  '\\d{9,22}',
  '\\d{4}[-/.]\\d{1,2}[-/.]\\d{1,2}',
  `\\d{4}[-/]${MONTH_NAMES}[-/]\\d{1,2}`,
  '\\d{4}年\\d{1,2}月\\d{1,2}日?',
  '\\d{1,2}[-/.]\\d{1,2}(?:[-/.]\\d{2,4})?',
  `${MONTH_NAMES}[-/.,\\s]+\\d{1,2}${ORDINAL_SUFFIX}(?:[-/.,\\s]+\\d{2,4})?`,
  `\\d{1,2}${ORDINAL_SUFFIX}[-/.,\\s]+(?:of\\s+)?${MONTH_NAMES}(?:[-/.,\\s]+\\d{2,4})?`,
].join('|');
const DATE_TIME_SUFFIX =
  '(?:[T ]\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?(?:[Zz]|[+-]\\d{2}(?::?\\d{2})?)?)?';
const DATE = `(?:${DATE_SHAPE})${DATE_TIME_SUFFIX}`;
const OPERATOR = '[+-]';
const NUMBER = '\\d+';
const UNIT =
  '(?:ms|millisecond|milliseconds|mo|month|months|w|week|weeks|d|day|days|h|hour|hours|m|min|minute|minutes|s|sec|second|seconds|y|yr|year|years)';
const ADD_PATTERN = new RegExp(
  `^(${DATE})\\s*(${OPERATOR})\\s*(${NUMBER})\\s*(${UNIT})$`,
  'i',
);
const DIFF_PATTERN = new RegExp(`^(${DATE})\\s+(?:to|-)\\s+(${DATE})$`, 'i');
const DATE_TIME_PATTERN =
  /^(.+?)[T ](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?([Zz]|[+-]\d{2}(?::?\d{2})?)?$/i;
const HOUR_MS_BY_UNIT: Record<string, number> = {
  h: HOUR_MS,
  hour: HOUR_MS,
  hours: HOUR_MS,
  m: MINUTE_MS,
  min: MINUTE_MS,
  minute: MINUTE_MS,
  minutes: MINUTE_MS,
  s: 1000,
  sec: 1000,
  second: 1000,
  seconds: 1000,
  ms: 1,
  millisecond: 1,
  milliseconds: 1,
};

type DateZone = 'date' | 'utc' | 'preferred' | { offsetHours: number };

interface ParsedDate {
  date: Date;
  dateOnly: boolean;
  zone: DateZone;
  subMillisecondMicroseconds: number;
}

interface Match {
  result: string;
  fromDate: string;
  toDate: string;
  days: number;
  operation: string;
}

function createUTCDate(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  millisecond = 0,
): Date {
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(hour, minute, second, millisecond);
  return date;
}

function currentPreferredDate(): Date {
  const now = new Date();
  return shiftDateToOffset(now, getTimezoneOffset(now));
}

function offsetForZone(zone: DateZone, date: Date): number {
  if (zone === 'preferred') return getTimezoneOffset(date);
  if (zone === 'date' || zone === 'utc') return 0;
  return zone.offsetHours;
}

function makeDate(
  wallDate: Date,
  zone: DateZone,
  subMillisecondMicroseconds = 0,
): ParsedDate | null {
  const offset =
    zone === 'preferred'
      ? getTimezoneOffset(wallDate)
      : offsetForZone(zone, wallDate);
  let date = new Date(wallDate.getTime() - offset * HOUR_MS);
  if (zone === 'preferred') {
    const resolvedOffset = getTimezoneOffset(date);
    if (resolvedOffset !== offset) {
      const resolvedDate = new Date(
        wallDate.getTime() - resolvedOffset * HOUR_MS,
      );
      if (
        shiftDateToOffset(
          resolvedDate,
          getTimezoneOffset(resolvedDate),
        ).getTime() === wallDate.getTime()
      ) {
        date = resolvedDate;
      }
    }
  }
  if (!Number.isFinite(date.getTime())) return null;
  return { date, dateOnly: false, zone, subMillisecondMicroseconds };
}

function makeDateOnly(year: number, month: number, day: number): ParsedDate {
  return {
    date: createUTCDate(year, month, day),
    dateOnly: true,
    zone: 'date',
    subMillisecondMicroseconds: 0,
  };
}

function parseTimestamp(value: string): ParsedDate | null {
  const match = /^([+-]?)(\d+)$/.exec(value);
  if (!match) return null;
  const digits = match[2].replace(/^0+(?=\d)/, '');
  if (digits.length < 9 || digits.length > 22) return null;

  const timestamp = BigInt(`${match[1]}${digits}`);
  let milliseconds: bigint;
  if (digits.length <= 11) milliseconds = timestamp * 1000n;
  else if (digits.length <= 14) milliseconds = timestamp;
  else if (digits.length <= 17) milliseconds = timestamp / 1000n;
  else milliseconds = timestamp / 1_000_000n;

  const date = new Date(Number(milliseconds));
  return Number.isFinite(date.getTime())
    ? { date, dateOnly: false, zone: 'utc', subMillisecondMicroseconds: 0 }
    : null;
}

function parseOffset(zone: string): number | null {
  if (/^z$/i.test(zone)) return 0;
  const match = /^([+-])(\d{2})(?::?(\d{2}))?$/.exec(zone);
  if (!match) return null;
  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? 0);
  if (hours > 14 || minutes > 59 || (hours === 14 && minutes !== 0)) {
    return null;
  }
  return (match[1] === '-' ? -1 : 1) * (hours + minutes / 60);
}

function parseDateInput(input: string): ParsedDate | null {
  const raw = trim(input);
  const keyword = raw.toLowerCase();
  if (keyword === 'now') {
    const date = new Date();
    return {
      date,
      dateOnly: false,
      zone: 'utc',
      subMillisecondMicroseconds: 0,
    };
  }
  if (
    keyword === 'today' ||
    keyword === 'tomorrow' ||
    keyword === 'yesterday'
  ) {
    const current = currentPreferredDate();
    const day =
      current.getUTCDate() +
      (keyword === 'tomorrow' ? 1 : keyword === 'yesterday' ? -1 : 0);
    const date = createUTCDate(
      current.getUTCFullYear(),
      current.getUTCMonth() + 1,
      day,
    );
    return {
      date,
      dateOnly: true,
      zone: 'date',
      subMillisecondMicroseconds: 0,
    };
  }

  if (/^[+-]?\d+$/.test(raw)) {
    const compactDate = /^\d{8}$/.test(raw) ? parseDateString(raw) : null;
    if (compactDate?.year !== undefined) {
      return makeDateOnly(compactDate.year, compactDate.month, compactDate.day);
    }
    return parseTimestamp(raw);
  }

  const datetime = DATE_TIME_PATTERN.exec(raw);
  if (datetime) {
    const dateParts = parseDateString(datetime[1]);
    const hour = Number(datetime[2]);
    const minute = Number(datetime[3]);
    const second = Number(datetime[4]);
    if (!dateParts || hour > 23 || minute > 59 || second > 59) {
      return null;
    }

    const year = dateParts.year ?? currentPreferredDate().getUTCFullYear();
    const fraction = datetime[5] ?? '';
    const millisecond = Number(fraction.slice(0, 3).padEnd(3, '0'));
    const subMillisecondMicroseconds = Number(
      fraction.slice(3, 6).padEnd(3, '0'),
    );
    const wallDate = createUTCDate(
      year,
      dateParts.month,
      dateParts.day,
      hour,
      minute,
      second,
      millisecond,
    );
    const rawZone = datetime[6];
    if (rawZone === undefined) {
      return makeDate(wallDate, 'preferred', subMillisecondMicroseconds);
    }
    const offset = parseOffset(rawZone);
    if (offset === null) return null;
    return makeDate(
      wallDate,
      rawZone.toLowerCase() === 'z' ? 'utc' : { offsetHours: offset },
      subMillisecondMicroseconds,
    );
  }

  const dateParts = parseDateString(raw);
  if (!dateParts) return null;
  const year = dateParts.year ?? currentPreferredDate().getUTCFullYear();
  return makeDateOnly(year, dateParts.month, dateParts.day);
}

function formatDateOnly(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function formatParsedDate(parsed: ParsedDate): string {
  if (parsed.dateOnly) return formatDateOnly(parsed.date);
  if (parsed.zone === 'preferred') {
    return toOffsetISOString(parsed.date, getTimezoneOffset(parsed.date));
  }
  const iso = parsed.date.toISOString();
  return iso.endsWith('T00:00:00.000Z') ? iso.slice(0, 10) : iso;
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [31, 0, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

function addCalendarUnit(
  parsed: ParsedDate,
  unit: 'day' | 'week' | 'month' | 'year',
  amount: number,
): ParsedDate | null {
  const offset = offsetForZone(parsed.zone, parsed.date);
  const wall = shiftDateToOffset(parsed.date, offset);
  const year = wall.getUTCFullYear();
  const month = wall.getUTCMonth() + 1;
  const day = wall.getUTCDate();
  let targetYear = year;
  let targetMonth = month;
  let targetDay = day;

  if (unit === 'year') {
    targetYear += amount;
    targetDay = Math.min(day, daysInMonth(targetYear, month));
  } else if (unit === 'month') {
    const monthIndex = year * 12 + month - 1 + amount;
    targetYear = Math.floor(monthIndex / 12);
    targetMonth = (((monthIndex % 12) + 12) % 12) + 1;
    targetDay = Math.min(day, daysInMonth(targetYear, targetMonth));
  } else {
    const dayOffset = unit === 'week' ? amount * 7 : amount;
    const adjusted = new Date(wall);
    adjusted.setUTCDate(adjusted.getUTCDate() + dayOffset);
    targetYear = adjusted.getUTCFullYear();
    targetMonth = adjusted.getUTCMonth() + 1;
    targetDay = adjusted.getUTCDate();
  }

  if (targetYear < 1 || targetYear > 9999) return null;
  const adjustedWall = createUTCDate(
    targetYear,
    targetMonth,
    targetDay,
    wall.getUTCHours(),
    wall.getUTCMinutes(),
    wall.getUTCSeconds(),
    wall.getUTCMilliseconds(),
  );
  const result = makeDate(
    adjustedWall,
    parsed.zone,
    parsed.subMillisecondMicroseconds,
  );
  if (result) result.dateOnly = parsed.dateOnly;
  return result;
}

function addDateUnit(
  parsed: ParsedDate,
  unit: string,
  amount: number,
): ParsedDate | null {
  if (
    unit === 'day' ||
    unit === 'week' ||
    unit === 'month' ||
    unit === 'year'
  ) {
    return addCalendarUnit(parsed, unit, amount);
  }
  const multiplier = HOUR_MS_BY_UNIT[unit];
  if (multiplier === undefined) return null;
  const date = new Date(parsed.date.getTime() + amount * multiplier);
  return Number.isFinite(date.getTime())
    ? { ...parsed, date, dateOnly: false }
    : null;
}

function calendarDaysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / DAY_MS);
}

function formatDayDifference(days: number): string {
  if (days === 0) return '0 seconds';
  const abs = Math.abs(days);
  return `${days < 0 ? '-' : ''}${abs} ${abs === 1 ? 'day' : 'days'}`;
}

function formatDuration(diffMicroseconds: bigint): string {
  const isNegative = diffMicroseconds < 0n;
  let remaining = isNegative ? -diffMicroseconds : diffMicroseconds;
  if (remaining === 0n) return '0 seconds';

  const days = remaining / 86_400_000_000n;
  remaining %= 86_400_000_000n;
  const hours = remaining / 3_600_000_000n;
  remaining %= 3_600_000_000n;
  const minutes = remaining / 60_000_000n;
  remaining %= 60_000_000n;
  const seconds = remaining / 1_000_000n;
  remaining %= 1_000_000n;
  const milliseconds = remaining / 1000n;
  const microseconds = remaining % 1000n;
  const parts: string[] = [];
  if (days > 0n) parts.push(`${days}d`);
  if (hours > 0n) parts.push(`${hours}h`);
  if (minutes > 0n) parts.push(`${minutes}m`);
  if (seconds > 0n) parts.push(`${seconds}s`);
  if (milliseconds > 0n) parts.push(`${milliseconds}ms`);
  if (microseconds > 0n) parts.push(`${microseconds}us`);
  if (parts.length === 1 && days > 0n) {
    return `${isNegative ? '-' : ''}${days} ${days > 1n ? 'days' : 'day'}`;
  }
  return `${isNegative ? '-' : ''}${parts.join(' ')}`;
}

export const DateCalculateBoxSource = {
  name: 'Date Calculate',
  description:
    'Add or subtract calendar or time units from a date, or compute the duration between two dates.',
  defaultInput: 'now + 7d',
  tag: '⏱',
  kind: 'Time',
  priority: PriorityDateCalculate,

  checkAddSubtractPattern(input: string): Match | undefined {
    const addMatch = ADD_PATTERN.exec(input);
    if (!addMatch) return undefined;

    const fromDate = parseDateInput(addMatch[1]);
    if (!fromDate) return undefined;
    const amount = Number(addMatch[3]);
    if (!Number.isSafeInteger(amount)) return undefined;

    const rawUnit = addMatch[4].toLowerCase();
    const unit =
      rawUnit === 'w' || rawUnit.startsWith('week')
        ? 'week'
        : rawUnit === 'mo' || rawUnit.startsWith('month')
          ? 'month'
          : rawUnit === 'y' || rawUnit === 'yr' || rawUnit.startsWith('year')
            ? 'year'
            : rawUnit === 'd' || rawUnit.startsWith('day')
              ? 'day'
              : rawUnit;
    const toDate = addDateUnit(
      fromDate,
      unit,
      amount * (addMatch[2] === '+' ? 1 : -1),
    );
    if (!toDate) return undefined;

    const days =
      fromDate.dateOnly && toDate.dateOnly
        ? calendarDaysBetween(fromDate.date, toDate.date)
        : Math.round(
            (toDate.date.getTime() - fromDate.date.getTime()) / DAY_MS,
          );
    const absoluteDays = Math.abs(days);
    const result = formatParsedDate(toDate);
    return {
      result,
      fromDate: formatParsedDate(fromDate),
      toDate: result,
      days: absoluteDays,
      operation: addMatch[2],
    };
  },

  checkDateDiffPattern(input: string): Match | undefined {
    const diffMatch = DIFF_PATTERN.exec(input);
    if (!diffMatch) return undefined;
    const fromDate = parseDateInput(diffMatch[1]);
    const toDate = parseDateInput(diffMatch[2]);
    if (!fromDate || !toDate) return undefined;

    const timeDiffMs = toDate.date.getTime() - fromDate.date.getTime();
    const days = calendarDaysBetween(fromDate.date, toDate.date);
    const result =
      fromDate.dateOnly && toDate.dateOnly
        ? formatDayDifference(days)
        : formatDuration(
            BigInt(timeDiffMs) * 1000n +
              BigInt(
                toDate.subMillisecondMicroseconds -
                  fromDate.subMillisecondMicroseconds,
              ),
          );

    return {
      result,
      fromDate: formatParsedDate(fromDate),
      toDate: formatParsedDate(toDate),
      days,
      operation: 'diff',
    };
  },

  checkMatch(input: string): Match | undefined {
    if (!isString(input)) return undefined;
    const regularInput = trim(input);
    if (!regularInput) return undefined;
    return (
      this.checkAddSubtractPattern(regularInput) ??
      this.checkDateDiffPattern(regularInput)
    );
  },

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (
      hasOptionKeys(options, 'relative', 'timeago', 'timelater', 'relativetime')
    ) {
      if (!isString(input) || trim(input).length === 0 || input.length > 100) {
        return [];
      }
      const raw = trim(input);
      const parsed = parseDateInput(raw);
      if (!parsed) {
        return [
          new BoxBuilder('Relative Time', `Invalid date: "${raw}"`)
            .setShowExpandButton(false)
            .setPriority(this.priority)
            .build(),
        ];
      }
      const diffMs = parsed.date.getTime() - Date.now();
      const abs = Math.abs(diffMs);
      const sign = diffMs < 0 ? -1 : 1;
      const [value, unit] =
        abs >= 365 * DAY_MS
          ? [sign * Math.round(abs / (365 * DAY_MS)), 'year' as const]
          : abs >= 30 * DAY_MS
            ? [sign * Math.round(abs / (30 * DAY_MS)), 'month' as const]
            : abs >= DAY_MS
              ? [sign * Math.round(abs / DAY_MS), 'day' as const]
              : abs >= HOUR_MS
                ? [sign * Math.round(abs / HOUR_MS), 'hour' as const]
                : abs >= MINUTE_MS
                  ? [sign * Math.round(abs / MINUTE_MS), 'minute' as const]
                  : [sign * Math.round(abs / 1000), 'second' as const];
      const rtf = new Intl.RelativeTimeFormat(getLocale(), { numeric: 'auto' });
      const relative = rtf.format(value, unit);
      return [
        new BoxBuilder('Relative Time', relative)
          .setOptions({
            Relative: relative,
            ISO: parsed.date.toISOString(),
            Direction: diffMs < -500 ? 'past' : diffMs > 500 ? 'future' : 'now',
          })
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const match = this.checkMatch(input);
    if (!match) return [];
    return [
      new BoxBuilder('Date Calculate', match.result)
        .setOptions({
          fromDate: match.fromDate,
          toDate: match.toDate,
          days: match.days.toString(),
          operation: match.operation,
        })
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default DateCalculateBoxSource;

export const exportedForTesting = {
  DATE,
  parseDate: (input: string): Date =>
    parseDateInput(input)?.date ?? new Date(Number.NaN),
};
