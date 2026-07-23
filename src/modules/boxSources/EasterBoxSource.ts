import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// valid gregorian computus range: 1583–9999
const MIN_YEAR = 1583;
const MAX_YEAR = 9999;

const YEAR_PATTERN = /^\d{1,6}$/;

// anonymous gregorian algorithm (meeus/jones/butcher) to compute easter sunday
function computeEaster(year: number): { month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

// format a UTC date as YYYY-MM-DD
function formatDate(year: number, month: number, day: number): string {
  const m = month.toString().padStart(2, '0');
  const d = day.toString().padStart(2, '0');
  return `${year}-${m}-${d}`;
}

// compute a date offset (in days) from an epoch ms using Date.UTC for determinism
function offsetDate(baseUtcMs: number, offsetDays: number): string {
  const ms = baseUtcMs + offsetDays * 24 * 60 * 60 * 1000;
  const d = new Date(ms);
  return formatDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

// build a "key: value\n..." plaintext string from an ordered entry list
function kvToPlaintext(entries: [string, string][]): string {
  return entries.map(([k, v]) => `${k}: ${v}`).join('\n');
}

function computeLunarNewYear(year: number): string | null {
  try {
    for (let m = 1; m <= 2; m++) {
      for (let d = 1; d <= 31; d++) {
        const date = new Date(Date.UTC(year, m - 1, d));
        if (date.getUTCFullYear() !== year) continue;
        const fmt = new Intl.DateTimeFormat('en-US-u-ca-chinese', {
          month: 'numeric',
          day: 'numeric',
        }).format(date);
        if (fmt === '1/1' || fmt.startsWith('1/1') || fmt.startsWith('1 / 1')) {
          return formatDate(year, m, d);
        }
      }
    }
  } catch {
    return null;
  }
  return null;
}

export const EasterBoxSource = {
  defaultDisabled: true,
  name: 'Easter',
  description:
    'Compute the date of Easter Sunday (Gregorian) and Lunar New Year for a given year.',
  defaultInput: '2025 ::easter',
  tag: '#',
  kind: 'Calculate',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'easter', 'lny', 'cny', 'lunarnewyear'))
      return [];

    // prefer the option value if it is a numeric string, else fall back to input
    const optionValue = extractOptionKeys(
      options,
      'easter',
      'lny',
      'cny',
      'lunarnewyear',
    );
    const rawYear =
      typeof optionValue === 'string' && YEAR_PATTERN.test(optionValue.trim())
        ? optionValue.trim()
        : trim(input);

    if (!YEAR_PATTERN.test(rawYear)) {
      return [
        new BoxBuilder(
          'Easter',
          'Invalid year. Enter a year between 1583 and 9999.',
        )
          .setTemplate(KeyValueBoxTemplate)
          .setOptions({
            Error: 'Invalid year. Enter a year between 1583 and 9999.',
          })
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const year = Number.parseInt(rawYear, 10);

    if (year < MIN_YEAR || year > MAX_YEAR) {
      const msg = `Year must be between ${MIN_YEAR} and ${MAX_YEAR} for the Gregorian computus.`;
      return [
        new BoxBuilder('Easter', msg)
          .setTemplate(KeyValueBoxTemplate)
          .setOptions({ Error: msg })
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const { month, day } = computeEaster(year);
    const easterUtcMs = Date.UTC(year, month - 1, day);

    const easterDate = formatDate(year, month, day);
    const monthName = month === 3 ? 'March' : 'April';
    const goodFriday = offsetDate(easterUtcMs, -2);
    const ashWednesday = offsetDate(easterUtcMs, -46);
    const lunarNewYear = computeLunarNewYear(year);

    const entries: [string, string][] = [
      ['Year', year.toString()],
      ['Easter Sunday', easterDate],
      ['Month', monthName],
      ['Good Friday', goodFriday],
      ['Ash Wednesday', ashWednesday],
    ];

    if (lunarNewYear) {
      entries.push(['Lunar New Year', lunarNewYear]);
    }

    const plaintext = kvToPlaintext(entries);
    const opts: Record<string, string> = Object.fromEntries(entries);

    return [
      new BoxBuilder('Easter', plaintext)
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(opts)
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default EasterBoxSource;
