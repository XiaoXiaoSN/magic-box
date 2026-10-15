import { isString, trim } from '@functions/helper';
import { getTimezoneOffset } from '@functions/runtimePrefs';
import { formatOffsetLabel, toOffsetISOString } from '@functions/timezone';
import type { Box } from '@modules/Box';
import { BoxBuilder } from '@modules/Box';

interface Match {
  timestamp: number;
  date: Date;
}

export const NowBoxSource = {
  name: 'Now',
  description:
    'Display the current time in UTC, the preferred timezone, and Unix timestamp.',
  defaultInput: 'now',
  tag: '⏱',
  kind: 'Time',

  checkMatch(input: string): Match | undefined {
    if (!isString(input)) {
      return undefined;
    }
    const regularInput = trim(input).toLowerCase();

    if (regularInput === 'now') {
      const timestamp = Date.now();
      const date = new Date(timestamp);
      return { timestamp, date };
    }

    return undefined;
  },

  async generateBoxes(input: string): Promise<Box[]> {
    const match = this.checkMatch(input);
    if (!match) {
      return [];
    }

    const { timestamp, date } = match;
    const offset = getTimezoneOffset(date);
    return [
      new BoxBuilder('RFC 3339', date.toISOString())
        .setShowExpandButton(false)

        .build(),
      new BoxBuilder(
        `RFC 3339 (${formatOffsetLabel(offset)})`,
        toOffsetISOString(date, offset),
      )
        .setShowExpandButton(false)

        .build(),
      new BoxBuilder('Timestamp (s)', Math.floor(timestamp / 1000).toString())
        .setShowExpandButton(false)

        .build(),
    ];
  },
};

export default NowBoxSource;
