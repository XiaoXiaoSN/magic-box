import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

const DAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

// standard gregorian-to-jdn algorithm (julian day number at noon)
function gregorianToJDN(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

// inverse jdn algorithm — returns [year, month, day] in proleptic gregorian
function jdnToGregorian(jdn: number): [number, number, number] {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = 100 * b + d - 4800 + Math.floor(m / 10);
  return [year, month, day];
}

// jdn % 7 → 0=Monday … 6=Sunday (verified: JDN 2451545 = 2000-01-01 = Saturday = index 5)
function dayOfWeekFromJDN(jdn: number): string {
  return DAY_NAMES[((jdn % 7) + 7) % 7];
}

function padDate(year: number, month: number, day: number): string {
  const y =
    year < 0
      ? `-${String(Math.abs(year)).padStart(4, '0')}`
      : String(year).padStart(4, '0');
  return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function kvToPlaintext(kv: Record<string, string>): string {
  return Object.entries(kv)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

export const JulianDayBoxSource = {
  name: 'Julian Day',
  description:
    'Convert a Gregorian date (YYYY-MM-DD) to its Julian Day Number, or a JDN back to a date.',
  defaultInput: '2000-01-01 ::julianday',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'julianday', 'jdn')) return [];

    const trimmed = trim(input);
    if (trimmed.length === 0 || trimmed.length > 40) return [];

    // plain number (possibly with decimal, possibly negative) → treat as jdn
    const jdnPattern = /^-?\d{1,7}(\.\d+)?$/;
    if (jdnPattern.test(trimmed)) {
      const jdn = Math.floor(Number.parseFloat(trimmed));
      const [year, month, day] = jdnToGregorian(jdn);
      const dateStr = padDate(year, month, day);
      const dow = dayOfWeekFromJDN(jdn);

      const kv: Record<string, string> = {
        'Julian Day Number': String(jdn),
        Date: dateStr,
        'Day of Week': dow,
      };
      const box = new BoxBuilder('Julian Day', kvToPlaintext(kv))
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(kv)
        .setPriority(Priority)
        .build();
      return [box];
    }

    // gregorian date → jdn
    const datePattern = /^(-?\d{1,6})-(\d{1,2})-(\d{1,2})$/;
    const match = datePattern.exec(trimmed);
    if (match) {
      const year = Number.parseInt(match[1], 10);
      const month = Number.parseInt(match[2], 10);
      const day = Number.parseInt(match[3], 10);

      if (month < 1 || month > 12 || day < 1 || day > 31) {
        const kv: Record<string, string> = {
          Error: 'Invalid date — month must be 1–12, day 1–31.',
        };
        const box = new BoxBuilder('Julian Day', kvToPlaintext(kv))
          .setTemplate(KeyValueBoxTemplate)
          .setOptions(kv)
          .setPriority(Priority)
          .build();
        return [box];
      }

      const jdn = gregorianToJDN(year, month, day);
      const dow = dayOfWeekFromJDN(jdn);
      const kv: Record<string, string> = {
        Date: padDate(year, month, day),
        'Julian Day Number': String(jdn),
        'Day of Week': dow,
      };
      const box = new BoxBuilder('Julian Day', kvToPlaintext(kv))
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(kv)
        .setPriority(Priority)
        .build();
      return [box];
    }

    // unrecognised format — return an informational box
    const kv: Record<string, string> = {
      Error: `Unrecognised input. Expected YYYY-MM-DD or an integer JDN.`,
      'Date format': 'YYYY-MM-DD (e.g. 2000-01-01)',
      'JDN format': 'integer (e.g. 2451545)',
    };
    const box = new BoxBuilder('Julian Day', kvToPlaintext(kv))
      .setTemplate(KeyValueBoxTemplate)
      .setOptions(kv)
      .setPriority(Priority)
      .build();
    return [box];
  },
};

export default JulianDayBoxSource;
