import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100;

// unit constants in seconds
const WEEK = 604800;
const DAY = 86400;
const HOUR = 3600;
const MINUTE = 60;

// build k:v plaintext for the KeyValueBoxTemplate plaintextOutput
function kvToPlaintext(kv: Record<string, string>): string {
  return Object.entries(kv)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

// convert a total-seconds value to a human-readable string, e.g. '1h 1m 1s'
function secondsToHuman(totalSeconds: number): string {
  if (totalSeconds === 0) return '0s';

  const w = Math.floor(totalSeconds / WEEK);
  const remaining1 = totalSeconds % WEEK;
  const d = Math.floor(remaining1 / DAY);
  const remaining2 = remaining1 % DAY;
  const h = Math.floor(remaining2 / HOUR);
  const remaining3 = remaining2 % HOUR;
  const m = Math.floor(remaining3 / MINUTE);
  const s = remaining3 % MINUTE;

  const parts: string[] = [];
  if (w > 0) parts.push(`${w}w`);
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0) parts.push(`${s}s`);

  return parts.join(' ');
}

// format a total-seconds value as a clock string HH:MM:SS or D:HH:MM:SS
function secondsToClock(totalSeconds: number): string {
  const d = Math.floor(totalSeconds / DAY);
  const remaining = totalSeconds % DAY;
  const h = Math.floor(remaining / HOUR);
  const m = Math.floor((remaining % HOUR) / MINUTE);
  const s = remaining % MINUTE;

  const hh = String(h).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');

  if (d > 0) {
    return `${d}:${hh}:${mm}:${ss}`;
  }
  return `${hh}:${mm}:${ss}`;
}

// parse a human duration string to total seconds using a linear regex
// supports tokens like 1w, 2d, 3h, 4m, 5s (case-insensitive, optional spaces between)
function humanToSeconds(input: string): number {
  const tokenRegex = /(\d+(?:\.\d+)?)\s*(w|d|h|m|s)/gi;
  const unitMap: Record<string, number> = {
    w: WEEK,
    d: DAY,
    h: HOUR,
    m: MINUTE,
    s: 1,
  };

  let total = 0;
  let match: RegExpExecArray | null;

  // biome-ignore lint/suspicious/noAssignInExpressions: idiomatic regex loop
  while ((match = tokenRegex.exec(input)) !== null) {
    const value = Number.parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    total += value * (unitMap[unit] ?? 0);
  }

  return total;
}

// count how many tokens the humanToSeconds parser matched
function countTokens(input: string): number {
  const tokenRegex = /(\d+(?:\.\d+)?)\s*(w|d|h|m|s)/gi;
  let count = 0;
  while (tokenRegex.exec(input) !== null) count++;
  return count;
}

export const DurationFormatBoxSource = {
  name: 'Duration',
  description:
    'Convert seconds to a human duration (1h 1m 1s) or parse a duration back to seconds.',
  defaultInput: '3661 ::duration',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'duration', 'humantime')) return [];

    const raw = trim(input);
    if (!raw || raw.length > MAX_INPUT) return [];

    // plain number → treat as seconds and convert to human form
    if (/^\d+(\.\d+)?$/.test(raw)) {
      // parseFloat (not parseInt) so a fractional input like 3661.5 isn't
      // silently truncated; the %/floor math below preserves the fraction
      const totalSeconds = Number.parseFloat(raw);
      const human = secondsToHuman(totalSeconds);
      const clock = secondsToClock(totalSeconds);

      const kv: Record<string, string> = {
        Seconds: String(totalSeconds),
        Human: human,
        Clock: clock,
      };

      return [
        new BoxBuilder('Duration', kvToPlaintext(kv))
          .setOptions(kv)
          .setTemplate(KeyValueBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }

    // human string → parse to total seconds
    const tokenCount = countTokens(raw);

    if (tokenCount === 0) {
      // no recognizable tokens — show a usage hint
      const hint =
        'No duration tokens found. Use units: w d h m s, e.g. "1h 30m" or "2d 4h".';
      const kv: Record<string, string> = {
        Input: raw,
        Hint: hint,
      };
      return [
        new BoxBuilder('Duration', kvToPlaintext(kv))
          .setOptions(kv)
          .setTemplate(KeyValueBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const totalSeconds = humanToSeconds(raw);
    const human = secondsToHuman(totalSeconds);

    const kv: Record<string, string> = {
      Input: raw,
      'Total Seconds': String(Math.round(totalSeconds)),
      Human: human,
    };

    return [
      new BoxBuilder('Duration', kvToPlaintext(kv))
        .setOptions(kv)
        .setTemplate(KeyValueBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default DurationFormatBoxSource;
