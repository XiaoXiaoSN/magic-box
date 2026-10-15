import { isString, trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import {
  errorBox,
  extractOptionKeys,
  hasOptionKeys,
  keyValueBox,
} from '@modules/Box';

const Priority = 10;
const MAX_INPUT_LENGTH = 100;

// segment regex to match duration tokens: e.g. "1.5h", "10s", "8789sec", "22sec", "1m48s", "1h3s", "500ms"
// ordered by length of unit to avoid greedy sub-matching
const SEGMENT_RE =
  /(\d+(?:\.\d+)?)\s*(milliseconds|millisecond|seconds|minutes|second|minute|weeks|hours|msec|days|week|hour|sec|min|ms|wk|hr|[wdhms])/gi;

const UNIT_MAP: Record<string, bigint> = {
  // milliseconds
  ms: 1n,
  msec: 1n,
  millisecond: 1n,
  milliseconds: 1n,
  // seconds
  s: 1000n,
  sec: 1000n,
  second: 1000n,
  seconds: 1000n,
  // minutes
  m: 60000n,
  min: 60000n,
  minute: 60000n,
  minutes: 60000n,
  // hours
  h: 3600000n,
  hr: 3600000n,
  hour: 3600000n,
  hours: 3600000n,
  // days
  d: 86400000n,
  day: 86400000n,
  days: 86400000n,
  // weeks
  w: 604800000n,
  wk: 604800000n,
  week: 604800000n,
  weeks: 604800000n,
};

interface DurationParts {
  weeks: bigint;
  days: bigint;
  hours: bigint;
  minutes: bigint;
  seconds: bigint;
  milliseconds: bigint;
}

const MAX_SAFE_MILLISECONDS = BigInt(Number.MAX_SAFE_INTEGER);

function roundScaled(numerator: bigint, scale: bigint): bigint {
  return (numerator + scale / 2n) / scale;
}

function decompose(totalMs: bigint): DurationParts {
  let remainingMs = totalMs;

  const wMs = 604800000n;
  const dMs = 86400000n;
  const hMs = 3600000n;
  const mMs = 60000n;
  const sMs = 1000n;

  const weeks = remainingMs / wMs;
  remainingMs %= wMs;

  const days = remainingMs / dMs;
  remainingMs %= dMs;

  const hours = remainingMs / hMs;
  remainingMs %= hMs;

  const minutes = remainingMs / mMs;
  remainingMs %= mMs;

  const seconds = remainingMs / sMs;
  remainingMs %= sMs;

  const milliseconds = remainingMs;

  return { weeks, days, hours, minutes, seconds, milliseconds };
}

function toCompact(parts: DurationParts): string {
  const { weeks, days, hours, minutes, seconds, milliseconds } = parts;
  const res: string[] = [];
  if (weeks > 0n) res.push(`${weeks}w`);
  if (days > 0n) res.push(`${days}d`);
  if (hours > 0n) res.push(`${hours}h`);
  if (minutes > 0n) res.push(`${minutes}m`);
  if (seconds > 0n) res.push(`${seconds}s`);
  if (milliseconds > 0n) res.push(`${milliseconds}ms`);

  if (res.length === 0) {
    return '0s';
  }
  return res.join(' ');
}

function toClock(parts: DurationParts): string {
  const { weeks, days, hours, minutes, seconds, milliseconds } = parts;
  const hh = hours.toString().padStart(2, '0');
  const mm = minutes.toString().padStart(2, '0');
  const ss = seconds.toString().padStart(2, '0');

  let base = `${hh}:${mm}:${ss}`;
  if (milliseconds > 0n) {
    base += `.${milliseconds.toString().padStart(3, '0')}`;
  }

  const totalDays = weeks * 7n + days;
  if (totalDays > 0n) {
    return `${totalDays}:${base}`;
  }
  return base;
}

function parseDecimalMilliseconds(value: string, unitMs: bigint): bigint {
  const [whole, fraction = ''] = value.split('.');
  const scale = 10n ** BigInt(fraction.length);
  const digits = BigInt(`${whole}${fraction}`);
  return roundScaled(digits * unitMs, scale);
}

function formatSeconds(totalMs: bigint): string {
  const whole = totalMs / 1000n;
  const fraction = (totalMs % 1000n)
    .toString()
    .padStart(3, '0')
    .replace(/0+$/, '');
  return fraction.length === 0 ? whole.toString() : `${whole}.${fraction}`;
}

function parseNumericMilliseconds(
  input: string,
  isMs: boolean,
): bigint | 'unsafe' {
  const milliseconds = parseDecimalMilliseconds(input, isMs ? 1n : 1000n);
  return milliseconds > MAX_SAFE_MILLISECONDS ? 'unsafe' : milliseconds;
}

function parseTotalMilliseconds(input: string): bigint | null | 'unsafe' {
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

  let totalNumerator = 0n;
  let totalScale = 1n;
  for (const match of matches) {
    const unit = match[2].toLowerCase();
    const unitMs = UNIT_MAP[unit];
    if (unitMs === undefined) return null;

    const [whole, fraction = ''] = match[1].split('.');
    const termScale = 10n ** BigInt(fraction.length);
    const termNumerator = BigInt(`${whole}${fraction}`) * unitMs;
    totalNumerator = totalNumerator * termScale + termNumerator * totalScale;
    totalScale *= termScale;
  }

  const milliseconds = roundScaled(totalNumerator, totalScale);
  return milliseconds > MAX_SAFE_MILLISECONDS ? 'unsafe' : milliseconds;
}

export const DurationBoxSource = {
  name: 'Duration',
  description:
    'Convert numeric seconds/milliseconds or human duration formats (e.g. 10s, 8789sec, 1m48s, 1h3s) to/from human durations and clock formats.',
  defaultInput: '3661\n::duration',
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
    if (input.length > MAX_INPUT_LENGTH) {
      return [
        errorBox(
          'Duration',
          `Input is too large (${input.length} characters, limit ${MAX_INPUT_LENGTH}).`,
          { priority: this.priority },
        ),
      ];
    }

    const raw = trim(input);
    if (raw.length === 0) return [];

    let totalMilliseconds: bigint | null | 'unsafe' = null;

    // Check if the input is a plain positive number
    if (/^\d+(\.\d+)?$/.test(raw)) {
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

      totalMilliseconds = parseNumericMilliseconds(raw, isMs);
    } else {
      // Try parsing it as a human-readable duration format string
      totalMilliseconds = parseTotalMilliseconds(raw);
    }

    if (totalMilliseconds === 'unsafe') {
      return [
        errorBox(
          'Duration',
          'Duration exceeds the safe numeric range and cannot be represented exactly.',
          { priority: this.priority },
        ),
      ];
    }

    if (totalMilliseconds === null) {
      // If the user triggered with ::duration or ::humantime, return a hint box per PR 361.
      if (hasOptionKeys(options, 'duration', 'humantime')) {
        const hint =
          'No duration tokens found. Use units: w d h m s, e.g. "1h 30m" or "2d 4h".';
        const kv: Record<string, string> = {
          Input: raw,
          Hint: hint,
        };
        return [
          keyValueBox('keyValue', 'Duration', kv, {
            priority: this.priority,
          }),
        ];
      }
      return [];
    }

    if (totalMilliseconds > MAX_SAFE_MILLISECONDS) {
      return [
        errorBox(
          'Duration',
          'Duration exceeds the safe numeric range and cannot be represented exactly.',
          { priority: this.priority },
        ),
      ];
    }

    const parts = decompose(totalMilliseconds);
    const human = toCompact(parts);
    const clock = toClock(parts);

    const output: Record<string, string> = {
      Seconds: formatSeconds(totalMilliseconds),
      Human: human,
      Clock: clock,
    };

    return [
      keyValueBox('keyValue', 'Duration', output, {
        priority: this.priority,
      }),
    ];
  },
};

export default DurationBoxSource;
