import { getTimezoneOffset } from '@functions/runtimePrefs';
import { formatOffsetLabel, toOffsetISOString } from '@functions/timezone';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const PriorityRFC3339 = 9;

interface Match {
  date: Date;
}

export const TimestampBoxSource = {
  name: 'Timestamp',
  description: 'Convert a Unix timestamp back to a human-readable date.',
  defaultInput: '1735794245',
  tag: '⏱',
  kind: 'Time',
  priority: PriorityRFC3339,

  checkMatch(input: string, options: BoxOptions = null): Match | undefined {
    const raw = input.trim();
    const match = /^([+-]?)(\d+)$/.exec(raw);
    if (!match) return undefined;

    const digits = match[2].replace(/^0+(?=\d)/, '');
    const explicit = hasOptionKeys(options, 'timestamp', 'unix', 'ts');
    if ((!explicit && digits.length < 9) || digits.length > 22) {
      return undefined;
    }

    const magnitude = BigInt(digits);
    const signedValue = match[1] === '-' ? -magnitude : magnitude;
    let milliseconds: bigint;
    if (digits.length <= 11) {
      milliseconds = signedValue * 1000n;
    } else if (digits.length <= 14) {
      milliseconds = signedValue;
    } else if (digits.length <= 17) {
      milliseconds = signedValue / 1000n;
    } else {
      milliseconds = signedValue / 1_000_000n;
    }

    const date = new Date(Number(milliseconds));
    return Number.isFinite(date.getTime()) ? { date } : undefined;
  },

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const match = this.checkMatch(input, options);
    if (!match) {
      return [];
    }

    const { date } = match;
    const offset = getTimezoneOffset(date);
    return [
      new BoxBuilder('RFC 3339', date.toISOString())
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build(),
      new BoxBuilder(
        `RFC 3339 (${formatOffsetLabel(offset)})`,
        toOffsetISOString(date, offset),
      )
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default TimestampBoxSource;
