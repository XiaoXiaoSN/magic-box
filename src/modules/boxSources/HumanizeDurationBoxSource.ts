import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { isString, trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// max input length guard against runaway regex backtracking
const MAX_INPUT_LENGTH = 50;

interface DurationParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
}

function decompose(totalSeconds: number): DurationParts {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds, totalSeconds };
}

function toCompact({ days, hours, minutes, seconds }: DurationParts): string {
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
  return parts.join(' ');
}

function pluralize(value: number, unit: string): string {
  return value === 1 ? `${value} ${unit}` : `${value} ${unit}s`;
}

function toLong({ days, hours, minutes, seconds }: DurationParts): string {
  const parts: string[] = [];
  if (days > 0) parts.push(pluralize(days, 'day'));
  if (hours > 0) parts.push(pluralize(hours, 'hour'));
  if (minutes > 0) parts.push(pluralize(minutes, 'minute'));
  if (seconds > 0 || parts.length === 0)
    parts.push(pluralize(seconds, 'second'));
  return parts.join(', ');
}

export const HumanizeDurationBoxSource = {
  name: 'Humanize Duration',
  description:
    'Turn a number of seconds into a human-readable duration. Use ::humanize=ms to treat the input as milliseconds.',
  defaultInput: '90061 ::humanize',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'humanize', 'duration')) return [];
    if (!isString(input)) return [];

    const raw = trim(input);
    if (raw.length === 0 || raw.length > MAX_INPUT_LENGTH) return [];
    if (!/^\d+(\.\d+)?$/.test(raw)) return [];

    const parsed = Number.parseFloat(raw);
    if (!Number.isFinite(parsed) || parsed < 0) return [];

    // treat as milliseconds when the option value is the string 'ms'
    const unitValue = extractOptionKeys(options, 'humanize', 'duration');
    const isMs = unitValue === 'ms';

    const totalSeconds = Math.floor(isMs ? parsed / 1000 : parsed);
    const parts = decompose(totalSeconds);

    const compact = toCompact(parts);
    const long = toLong(parts);
    const totalSecondsStr = totalSeconds.toString();

    // plaintext summary shown when no template renders
    const plaintextOutput = `Compact: ${compact}\nLong: ${long}\nTotal Seconds: ${totalSecondsStr}`;

    const outputOptions: Record<string, string> = {
      Compact: compact,
      Long: long,
      'Total Seconds': totalSecondsStr,
    };

    return [
      new BoxBuilder('Humanize Duration', plaintextOutput)
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(outputOptions)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default HumanizeDurationBoxSource;
