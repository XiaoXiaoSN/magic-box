import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// seconds per unit
const SECONDS_PER_DAY = 86400;
const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_MINUTE = 60;

interface DurationParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
}

// break a non-negative total-seconds value into d/h/m/s components
function decompose(total: number): DurationParts {
  const days = Math.floor(total / SECONDS_PER_DAY);
  const afterDays = total - days * SECONDS_PER_DAY;
  const hours = Math.floor(afterDays / SECONDS_PER_HOUR);
  const afterHours = afterDays - hours * SECONDS_PER_HOUR;
  const minutes = Math.floor(afterHours / SECONDS_PER_MINUTE);
  const seconds = afterHours - minutes * SECONDS_PER_MINUTE;
  return { days, hours, minutes, seconds, totalSeconds: total };
}

// join only non-zero components; for zero total return '0s'
function humanize(parts: DurationParts): string {
  const segments: string[] = [];
  if (parts.days > 0) segments.push(`${parts.days}d`);
  if (parts.hours > 0) segments.push(`${parts.hours}h`);
  if (parts.minutes > 0) segments.push(`${parts.minutes}m`);
  if (parts.seconds > 0 || segments.length === 0) {
    segments.push(`${parts.seconds}s`);
  }
  return segments.join(' ');
}

export const DurationBoxSource = {
  name: 'Duration',
  description:
    'Convert a number of seconds into a human-readable duration (days, hours, minutes, seconds).',
  defaultInput: '3661 ::duration',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'duration')) return [];

    const raw = trim(input).slice(0, 50);
    if (!/^\d+(\.\d+)?$/.test(raw)) return [];

    const total = Number.parseFloat(raw);
    if (Number.isNaN(total) || total < 0) return [];

    const parts = decompose(total);
    const human = humanize(parts);

    const data: Record<string, string> = {
      Human: human,
      Days: String(parts.days),
      Hours: String(parts.hours),
      Minutes: String(parts.minutes),
      Seconds: String(parts.seconds),
      'Total Seconds': String(total),
    };

    return [
      new BoxBuilder('Duration', '')
        .setOptions(data)
        .setTemplate(KeyValueBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default DurationBoxSource;
