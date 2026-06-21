import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// maps unit letter(s) to their value in seconds
const UNIT_SECONDS: Record<string, number> = {
  w: 604800,
  d: 86400,
  h: 3600,
  m: 60,
  s: 1,
  ms: 0.001,
};

// tokenizes a duration string into (value, unit) pairs; returns null on any invalid segment
const SEGMENT_RE = /(\d+(?:\.\d+)?)\s*(ms|[wdhms])/gi;

function parseTotalSeconds(input: string): number | null {
  const cleaned = input.trim();
  if (!cleaned) return null;

  const matches = [...cleaned.matchAll(SEGMENT_RE)];
  if (matches.length === 0) return null;

  // verify the full string is covered — no leftover garbage characters
  const reconstructed = matches.map((m) => m[0].replace(/\s+/g, '')).join('');
  const withoutSpaces = cleaned.replace(/\s+/g, '');
  if (reconstructed !== withoutSpaces) return null;

  let total = 0;
  for (const match of matches) {
    const value = Number.parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    const multiplier = UNIT_SECONDS[unit];
    if (multiplier === undefined) return null;
    total += value * multiplier;
  }

  return total;
}

// rebuilds a human-readable string (e.g. '1h 30m 20s') from total seconds
function toHumanDuration(totalSeconds: number): string {
  const units: Array<[string, number]> = [
    ['w', 604800],
    ['d', 86400],
    ['h', 3600],
    ['m', 60],
    ['s', 1],
  ];

  const parts: string[] = [];
  let remaining = totalSeconds;

  for (const [label, secs] of units) {
    if (remaining >= secs) {
      const count = Math.floor(remaining / secs);
      parts.push(`${count}${label}`);
      remaining -= count * secs;
    }
  }

  // include sub-second milliseconds when no whole seconds remain
  if (remaining > 0) {
    const ms = Math.round(remaining * 1000);
    parts.push(`${ms}ms`);
  }

  return parts.join(' ') || '0s';
}

export const DurationParseBoxSource = {
  name: 'Parse Duration',
  description:
    'Parse a human duration like "1h30m" or "2d4h" into total seconds.',
  defaultInput: '1h30m20s ::parseduration',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'parseduration', 'duration2s')) return [];

    const cleaned = trim(input).slice(0, 100);
    const totalSeconds = parseTotalSeconds(cleaned);
    if (totalSeconds === null) return [];

    const totalMs = totalSeconds * 1000;
    const human = toHumanDuration(totalSeconds);

    // format numbers without trailing zeros for clean display
    const fmtSeconds = Number.isInteger(totalSeconds)
      ? totalSeconds.toString()
      : Number.parseFloat(totalSeconds.toFixed(6)).toString();

    const fmtMs = Number.isInteger(totalMs)
      ? totalMs.toString()
      : Number.parseFloat(totalMs.toFixed(3)).toString();

    const output: Record<string, string> = {
      'Total Seconds': fmtSeconds,
      'Total Milliseconds': fmtMs,
      Human: human,
    };

    const content = Object.entries(output)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    return [
      new BoxBuilder('Parse Duration', content)
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(output)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default DurationParseBoxSource;
