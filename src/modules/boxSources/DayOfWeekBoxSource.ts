import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// max input length to avoid processing huge strings
const MAX_INPUT_LENGTH = 40;

const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

// days in each month for a given year (1-indexed, month 1-12)
function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }
  return [31, 0, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

// Zeller's congruence (Gregorian) returns 0=Sunday … 6=Saturday
function zellerWeekday(year: number, month: number, day: number): number {
  // january and february are treated as months 13 and 14 of the previous year
  let y = year;
  let m = month;
  if (m <= 2) {
    m += 12;
    y -= 1;
  }
  const k = y % 100;
  const j = Math.floor(y / 100);
  // normalize to handle negative JS modulo results
  const h =
    (((day +
      Math.floor((13 * (m + 1)) / 5) +
      k +
      Math.floor(k / 4) +
      Math.floor(j / 4) -
      2 * j) %
      7) +
      7) %
    7;
  // h: 0=Sat,1=Sun,2=Mon,3=Tue,4=Wed,5=Thu,6=Fri → convert to 0=Sun…6=Sat
  return (h + 6) % 7;
}

// day of year, 1-based
function dayOfYear(year: number, month: number, day: number): number {
  const DAYS_BEFORE_MONTH = [
    0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334,
  ];
  const base = DAYS_BEFORE_MONTH[month - 1];
  const leapOffset = month > 2 && isLeapYear(year) ? 1 : 0;
  return base + leapOffset + day;
}

// thursday of the week containing this date (ISO weeks pivot on Thursday)
function isoWeekAndYear(
  year: number,
  month: number,
  day: number,
): { week: number; isoYear: number } {
  const doy = dayOfYear(year, month, day);

  // ISO weekday: 1=Mon … 7=Sun
  const zellerDay = zellerWeekday(year, month, day); // 0=Sun…6=Sat
  const isoWeekday = zellerDay === 0 ? 7 : zellerDay; // 1=Mon…7=Sun

  // ordinal of the nearest Thursday (ISO weeks are numbered by their Thursday)
  const thursdayOrdinal = doy + (4 - isoWeekday);

  if (thursdayOrdinal < 1) {
    // Thursday falls in the previous year
    const prevYear = year - 1;
    const daysInPrevYear = isLeapYear(prevYear) ? 366 : 365;
    const prevThursdayOrdinal = daysInPrevYear + thursdayOrdinal;
    const week = Math.ceil(prevThursdayOrdinal / 7);
    return { week, isoYear: prevYear };
  }

  const daysInCurrentYear = isLeapYear(year) ? 366 : 365;
  if (thursdayOrdinal > daysInCurrentYear) {
    // Thursday falls in the next year → week 1 of next year
    return { week: 1, isoYear: year + 1 };
  }

  const week = Math.ceil(thursdayOrdinal / 7);
  return { week, isoYear: year };
}

function kvToPlaintext(kv: Record<string, string>): string {
  return Object.entries(kv)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

interface ParsedDate {
  year: number;
  month: number;
  day: number;
}

// returns ParsedDate on valid input, or a string describing the error
function parseDate(raw: string): ParsedDate | string {
  const match = raw.match(/^(\d{1,6})-(\d{1,2})-(\d{1,2})$/);
  if (!match) {
    return 'Input must be a date in YYYY-MM-DD format (e.g. 2025-12-25).';
  }

  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);

  if (month < 1 || month > 12) {
    return `Invalid month ${month}. Month must be between 1 and 12.`;
  }

  const maxDay = daysInMonth(year, month);
  if (day < 1 || day > maxDay) {
    return `Invalid day ${day} for ${year}-${String(month).padStart(2, '0')}. Day must be between 1 and ${maxDay}.`;
  }

  return { year, month, day };
}

export const DayOfWeekBoxSource = {
  defaultDisabled: true,
  name: 'Day of Week',
  description:
    'Compute the weekday, day-of-year, and ISO week for a date (YYYY-MM-DD).',
  defaultInput: '2025-12-25 ::dayofweek',
  tag: '#',
  kind: 'Calculate',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'dayofweek', 'weekday')) return [];

    const raw = trim(input);
    if (raw.length === 0 || raw.length > MAX_INPUT_LENGTH) return [];

    const parsed = parseDate(raw);

    if (typeof parsed === 'string') {
      // invalid input — return an explanatory box
      const errorKv = { 'Invalid Date': parsed };
      return [
        new BoxBuilder('Day of Week', kvToPlaintext(errorKv))
          .setTemplate(KeyValueBoxTemplate)
          .setOptions(errorKv)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const { year, month, day } = parsed;

    const weekdayIndex = zellerWeekday(year, month, day);
    const weekday = WEEKDAY_NAMES[weekdayIndex];
    const doy = dayOfYear(year, month, day);
    const { week, isoYear } = isoWeekAndYear(year, month, day);
    const isoWeek = `${isoYear}-W${String(week).padStart(2, '0')}`;
    const leap = isLeapYear(year) ? 'true' : 'false';

    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const kv: Record<string, string> = {
      Date: dateStr,
      Weekday: weekday,
      'Day of Year': String(doy),
      'ISO Week': isoWeek,
      'Leap Year': leap,
    };

    return [
      new BoxBuilder('Day of Week', kvToPlaintext(kv))
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(kv)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default DayOfWeekBoxSource;
