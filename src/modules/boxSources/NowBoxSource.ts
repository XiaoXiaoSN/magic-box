import { isString, trim } from '@functions/helper';
import { resolveBoxTimezone } from '@functions/runtimePrefs';
import { formatOffsetLabel, toOffsetISOString } from '@functions/timezone';
import { type Box, BoxBuilder, type BoxOptions, errorBox } from '@modules/Box';
import type { BoxSourceContext } from '@modules/BoxSource';

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

  checkMatch(input: string, now = Date.now()): Match | undefined {
    if (!isString(input)) {
      return undefined;
    }
    const regularInput = trim(input).toLowerCase();

    if (regularInput === 'now') {
      const timestamp = now;
      const date = new Date(timestamp);
      return { timestamp, date };
    }

    return undefined;
  },

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
    context?: BoxSourceContext,
  ): Promise<Box[]> {
    const match = this.checkMatch(input, context?.now);
    if (!match) {
      return [];
    }

    const { timestamp, date } = match;
    const timezone = resolveBoxTimezone(options, context);
    if ('error' in timezone) return [errorBox('Now', timezone.error)];
    const offset = timezone.offsetAt(date);
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
