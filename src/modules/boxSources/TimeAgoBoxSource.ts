import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// thresholds in milliseconds for choosing the largest sensible unit
const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const MONTH_MS = 30 * DAY_MS;
const YEAR_MS = 365 * DAY_MS;

type RelativeUnit = 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second';

// picks the largest sensible unit and returns value + unit for Intl.RelativeTimeFormat
function pickUnit(diffMs: number): [number, RelativeUnit] {
  const abs = Math.abs(diffMs);
  const sign = diffMs < 0 ? -1 : 1;

  if (abs >= YEAR_MS) return [sign * Math.round(abs / YEAR_MS), 'year'];
  if (abs >= MONTH_MS) return [sign * Math.round(abs / MONTH_MS), 'month'];
  if (abs >= DAY_MS) return [sign * Math.round(abs / DAY_MS), 'day'];
  if (abs >= HOUR_MS) return [sign * Math.round(abs / HOUR_MS), 'hour'];
  if (abs >= MINUTE_MS) return [sign * Math.round(abs / MINUTE_MS), 'minute'];
  return [sign * Math.round(abs / 1000), 'second'];
}

// parses the trimmed input as a unix timestamp (10 = seconds, 13 = ms) or an ISO/parseable date string
function parseInput(s: string): Date {
  if (/^\d{10}$/.test(s)) {
    return new Date(Number.parseInt(s, 10) * 1000);
  }
  if (/^\d{13}$/.test(s)) {
    return new Date(Number.parseInt(s, 10));
  }
  return new Date(s);
}

export const TimeAgoBoxSource = {
  name: 'Time Ago',
  description:
    'Show the relative time of a date (e.g. "3 days ago"). Accepts ISO dates or unix timestamps.',
  defaultInput: '2020-01-01T00:00:00Z ::timeago',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'timeago', 'relativetime')) return [];

    const raw = trim(input);
    const date = parseInput(raw);

    if (Number.isNaN(date.getTime())) {
      const box = new BoxBuilder('Time Ago', `Invalid date: "${raw}"`)
        .setOptions({ Error: `"${raw}" could not be parsed as a date` })
        .setTemplate(KeyValueBoxTemplate)
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build();
      return [box];
    }

    const diffMs = date.getTime() - Date.now();
    const [value, unit] = pickUnit(diffMs);
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    const relative = rtf.format(value, unit);

    const direction = diffMs < -500 ? 'past' : diffMs > 500 ? 'future' : 'now';

    const box = new BoxBuilder('Time Ago', relative)
      .setOptions({
        Relative: relative,
        ISO: date.toISOString(),
        Direction: direction,
      })
      .setTemplate(KeyValueBoxTemplate)
      .setShowExpandButton(false)
      .setPriority(this.priority)
      .build();

    return [box];
  },
};

export default TimeAgoBoxSource;
