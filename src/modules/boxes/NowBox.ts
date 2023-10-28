import { DefaultBox } from '@components/Boxes';
import { isString, trim } from '@functions/helper';
import { Box, BoxBuilder } from '@modules/Box';

const PriorityRFC3339 = 9;

interface Match {
  timestamp: number,
  date: Date,
  twDate: Date,
}

export const NowBoxSource = {
  checkMatch(input: string): Match | undefined {
    if (!isString(input)) {
      return undefined;
    }
    const regularInput = trim(input).toLowerCase();

    if (regularInput === 'now') {
      const timestamp = Date.now();
      const tzOffset = (8 * 60 * 60) * 1000;
      const date = new Date(timestamp);
      const twDate = new Date(timestamp + tzOffset);

      return { timestamp, date, twDate };
    }

    return undefined;
  },

  async generateBoxes(input: string): Promise<Box[]> {
    const match = this.checkMatch(input);
    if (!match) {
      return [];
    }

    const { timestamp, date, twDate } = match;
    return [
      new BoxBuilder('RFC 3339', date.toISOString())
        .setPriority(PriorityRFC3339)
        .setComponent(DefaultBox)
        .build(),
      new BoxBuilder('RFC 3339 (UTC+8)', twDate.toISOString().replace('Z', '+08:00'))
        .setPriority(PriorityRFC3339)
        .setComponent(DefaultBox)
        .build(),
      new BoxBuilder('Timestamp (s)', (timestamp / 1000).toString())
        .setComponent(DefaultBox)
        .build(),
    ];
  },
};

export default NowBoxSource;
