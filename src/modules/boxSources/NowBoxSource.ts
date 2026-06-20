import { isString, trim } from '@functions/helper';
import { getTimezoneOffset } from '@functions/runtimePrefs';
import {
  formatOffsetLabel,
  shiftDateToOffset,
  toOffsetISOString,
} from '@functions/timezone';
import type { Box } from '@modules/Box';
import { BoxBuilder } from '@modules/Box';

const PriorityRFC3339 = 10;

interface Match {
  timestamp: number;
  date: Date;
  twDate: Date;
}

export const NowBoxSource = {
  name: 'Now',
  description:
    'Display the current time in RFC 3339, RFC 3339 (UTC+8), and Unix timestamp.',
  defaultInput: 'now',
  tag: '⏱',
  kind: 'Time',
  priority: PriorityRFC3339,

  checkMatch(input: string): Match | undefined {
    if (!isString(input)) {
      return undefined;
    }
    const regularInput = trim(input).toLowerCase();

    if (regularInput === 'now') {
      const timestamp = Date.now();
      const date = new Date(timestamp);
      // `twDate` keeps its name for back-compat but now follows the configured
      // default timezone offset rather than a hardcoded +8.
      const twDate = shiftDateToOffset(date, getTimezoneOffset());

      return { timestamp, date, twDate };
    }

    return undefined;
  },

  async generateBoxes(input: string): Promise<Box[]> {
    const match = this.checkMatch(input);
    if (!match) {
      return [];
    }

    const { timestamp, date } = match;
    const offset = getTimezoneOffset();
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
      new BoxBuilder('Timestamp (s)', (timestamp / 1000).toString())
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default NowBoxSource;
