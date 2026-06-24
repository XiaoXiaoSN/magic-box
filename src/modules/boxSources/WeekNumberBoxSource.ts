import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// day names indexed by ISO weekday (1=Mon..7=Sun)
const DAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

// compute ISO 8601 week number, ISO year, and ISO weekday for a given UTC date
function isoWeekData(d: Date): {
  isoYear: number;
  week: number;
  isoWeekday: number;
} {
  // work on a copy at UTC midnight to avoid DST shifts
  const date = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );

  // ISO weekday: Mon=0..Sun=6 (shifted from JS Sun=0..Sat=6)
  const dayNum = (date.getUTCDay() + 6) % 7;

  // move to the Thursday of this week (week is defined by its Thursday)
  date.setUTCDate(date.getUTCDate() + 3 - dayNum);
  const isoYear = date.getUTCFullYear();

  // Jan 4 is always in ISO week 1; find the Thursday of that week 1
  const week1 = new Date(Date.UTC(isoYear, 0, 4));
  const week1DayNum = (week1.getUTCDay() + 6) % 7;
  week1.setUTCDate(week1.getUTCDate() + 3 - week1DayNum);

  const week =
    1 +
    Math.round((date.getTime() - week1.getTime()) / (7 * 24 * 60 * 60 * 1000));

  // ISO weekday 1=Mon..7=Sun
  const isoWeekday =
    ((new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
    ).getUTCDay() +
      6) %
      7) +
    1;

  return { isoYear, week, isoWeekday };
}

// compute day-of-year (1-366) using UTC fields
function dayOfYear(d: Date): number {
  const start = new Date(Date.UTC(d.getUTCFullYear(), 0, 0));
  const current = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
  return Math.round(
    (current.getTime() - start.getTime()) / (24 * 60 * 60 * 1000),
  );
}

// format a UTC date as yyyy-MM-dd
function formatDate(d: Date): string {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export const WeekNumberBoxSource = {
  defaultDisabled: true,
  name: 'Week Number',
  description:
    'Compute the ISO 8601 week number (and weekday, day-of-year) for a date.',
  defaultInput: '2024-01-01 ::weeknum',
  tag: '#',
  kind: 'Analyze',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'weeknum', 'isoweek')) return [];

    const raw = trim(input).slice(0, 64);

    // resolve the target date
    let date: Date;
    if (raw === '' || raw === 'today' || raw === 'now') {
      date = new Date();
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      // pin a date-only string to UTC midnight so the week is timezone-stable
      date = new Date(`${raw}T00:00:00Z`);
    } else {
      date = new Date(raw);
    }

    if (Number.isNaN(date.getTime())) {
      const errText = `Invalid date: "${raw}"`;
      return [
        new BoxBuilder('Week Number', errText)
          .setTemplate(KeyValueBoxTemplate)
          .setOptions({ Error: errText })
          .setPriority(this.priority)
          .build(),
      ];
    }

    const { isoYear, week, isoWeekday } = isoWeekData(date);
    const doy = dayOfYear(date);
    const dateStr = formatDate(date);
    const isoWeekStr = `${isoYear}-W${String(week).padStart(2, '0')}`;
    const weekdayName = DAY_NAMES[isoWeekday - 1];

    const kvOptions: Record<string, string> = {
      Date: dateStr,
      'ISO Week': isoWeekStr,
      Week: String(week),
      'ISO Year': String(isoYear),
      Weekday: weekdayName,
      'Day of Year': String(doy),
    };

    const plaintext = Object.entries(kvOptions)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    return [
      new BoxBuilder('Week Number', plaintext)
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(kvOptions)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default WeekNumberBoxSource;
