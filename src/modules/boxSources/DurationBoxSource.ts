import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { isString, trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { extractOptionKeys, hasOptionKeys, keyValueBox } from '@modules/Box';

const Priority = 10;
const MAX_INPUT_LENGTH = 100;

// segment regex to match duration tokens: e.g. "1.5h", "10s", "8789sec", "22sec", "1m48s", "1h3s", "500ms"
// ordered by length of unit to avoid greedy sub-matching
const SEGMENT_RE =
  /(\d+(?:\.\d+)?)\s*(milliseconds|millisecond|seconds|minutes|second|minute|weeks|hours|msec|days|week|hour|sec|min|ms|wk|hr|[wdhms])/gi;

const UNIT_MAP: Record<string, number> = {
  // milliseconds
  ms: 0.001,
  msec: 0.001,
  millisecond: 0.001,
  milliseconds: 0.001,
  // seconds
  s: 1,
  sec: 1,
  second: 1,
  seconds: 1,
  // minutes
  m: 60,
  min: 60,
  minute: 60,
  minutes: 60,
  // hours
  h: 3600,
  hr: 3600,
  hour: 3600,
  hours: 3600,
  // days
  d: 86400,
  day: 86400,
  days: 86400,
  // weeks
  w: 604800,
  wk: 604800,
  week: 604800,
  weeks: 604800,
};

interface DurationParts {
  weeks: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  milliseconds: number;
}

function decompose(totalSeconds: number): DurationParts {
  // Avoid floating-point issues by working with rounded milliseconds
  let remainingMs = Math.round(totalSeconds * 1000);

  const wMs = 604800 * 1000;
  const dMs = 86400 * 1000;
  const hMs = 3600 * 1000;
  const mMs = 60 * 1000;
  const sMs = 1000;

  const weeks = Math.floor(remainingMs / wMs);
  remainingMs %= wMs;

  const days = Math.floor(remainingMs / dMs);
  remainingMs %= dMs;

  const hours = Math.floor(remainingMs / hMs);
  remainingMs %= hMs;

  const minutes = Math.floor(remainingMs / mMs);
  remainingMs %= mMs;

  const seconds = Math.floor(remainingMs / sMs);
  remainingMs %= sMs;

  const milliseconds = remainingMs;

  return { weeks, days, hours, minutes, seconds, milliseconds };
}

function toCompact(parts: DurationParts): string {
  const { weeks, days, hours, minutes, seconds, milliseconds } = parts;
  const res: string[] = [];
  if (weeks > 0) res.push(`${weeks}w`);
  if (days > 0) res.push(`${days}d`);
  if (hours > 0) res.push(`${hours}h`);
  if (minutes > 0) res.push(`${minutes}m`);
  if (seconds > 0) res.push(`${seconds}s`);
  if (milliseconds > 0) res.push(`${milliseconds}ms`);

  if (res.length === 0) {
    return '0s';
  }
  return res.join(' ');
}

function toClock(parts: DurationParts): string {
  const { weeks, days, hours, minutes, seconds, milliseconds } = parts;
  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  let base = `${hh}:${mm}:${ss}`;
  if (milliseconds > 0) {
    base += `.${String(milliseconds).padStart(3, '0')}`;
  }

  const totalDays = weeks * 7 + days;
  if (totalDays > 0) {
    return `${totalDays}:${base}`;
  }
  return base;
}

function parseTotalSeconds(input: string): number | null {
  const cleaned = input.trim();
  if (!cleaned) return null;

  // If the input is purely numeric, it's not a humanized duration format string.
  if (/^\d+(\.\d+)?$/.test(cleaned)) {
    return null;
  }

  const matches = [...cleaned.matchAll(SEGMENT_RE)];
  if (matches.length === 0) return null;

  // Verify the entire input (except whitespace and commas) is matched by valid segments
  const reconstructed = matches.map((m) => m[0].replace(/\s+/g, '')).join('');
  const target = cleaned.replace(/[\s,]+/g, '');
  if (reconstructed.toLowerCase() !== target.toLowerCase()) return null;

  let total = 0;
  for (const match of matches) {
    const value = Number.parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    const multiplier = UNIT_MAP[unit];
    if (multiplier === undefined) return null;
    total += value * multiplier;
  }

  return total;
}

function formatFloat(val: number, decimals: number): string {
  if (Number.isInteger(val)) return val.toString();
  const fixed = val.toFixed(decimals);
  const parsed = Number.parseFloat(fixed);
  if (parsed === 0 && val > 0) {
    return val.toString();
  }
  return parsed.toString();
}

export const DurationBoxSource = {
  name: 'Duration',
  description:
    'Convert numeric seconds/milliseconds or human duration formats (e.g. 10s, 8789sec, 1m48s, 1h3s) to/from human durations and clock formats.',
  defaultInput: '3661 ::duration',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (
      !hasOptionKeys(
        options,
        'duration',
        'humantime',
        'parseduration',
        'duration2s',
        'humanize',
      )
    ) {
      return [];
    }

    if (!isString(input)) return [];

    const raw = trim(input);
    if (raw.length === 0 || raw.length > MAX_INPUT_LENGTH) return [];

    let totalSeconds: number | null = null;

    // Check if the input is a plain positive number
    if (/^\d+(\.\d+)?$/.test(raw)) {
      const parsed = Number.parseFloat(raw);
      if (!Number.isFinite(parsed) || parsed < 0) return [];

      // Check if unit is ms
      const optVal = extractOptionKeys(
        options,
        'duration',
        'humantime',
        'parseduration',
        'duration2s',
        'humanize',
      );
      const isMs = typeof optVal === 'string' && optVal.toLowerCase() === 'ms';

      totalSeconds = isMs ? parsed / 1000 : parsed;
    } else {
      // Try parsing it as a human-readable duration format string
      totalSeconds = parseTotalSeconds(raw);
    }

    if (totalSeconds === null || totalSeconds < 0) {
      // If the user triggered with ::duration or ::humantime, return a hint box per PR 361.
      if (hasOptionKeys(options, 'duration', 'humantime')) {
        const hint =
          'No duration tokens found. Use units: w d h m s, e.g. "1h 30m" or "2d 4h".';
        const kv: Record<string, string> = {
          Input: raw,
          Hint: hint,
        };
        return [
          keyValueBox(KeyValueBoxTemplate, 'Duration', kv, {
            priority: this.priority,
          }),
        ];
      }
      return [];
    }

    const parts = decompose(totalSeconds);
    const human = toCompact(parts);
    const clock = toClock(parts);

    const fmtSeconds = formatFloat(totalSeconds, 6);

    const output: Record<string, string> = {
      Seconds: fmtSeconds,
      Human: human,
      Clock: clock,
    };

    return [
      keyValueBox(KeyValueBoxTemplate, 'Duration', output, {
        priority: this.priority,
      }),
    ];
  },
};

export default DurationBoxSource;
