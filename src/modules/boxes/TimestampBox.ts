import { DefaultBox } from '@components/Boxes';
import { isNumeric } from '@functions/helper';
import { Box, BoxBuilder } from '@modules/Box';

const PriorityRFC3339 = 9;

interface Match {
  date: Date,
  twDate: Date,
}

export const TimestampBoxSource = {
  checkMatch(input: string): Match | undefined {
    if (!isNumeric(input)) {
      return undefined;
    }

    const tzOffset = (8 * 60 * 60) * 1000;
    const minTimestamp = new Date(1600, 1, 1, 0, 0, 0, 0);
    const maxTimestamp = new Date(2050, 12, 31, 23, 59, 59, 0);

    try {
      let date = new Date(parseFloat(input) * 1000);
      let twDate = new Date(parseFloat(input) * 1000 + tzOffset);

      // check max and min timestamp
      if (date < minTimestamp) {
        return undefined;
      }
      if (date > maxTimestamp) {
        // guess the big number is a timestamp in ms, convert ms to sec
        date = new Date(parseFloat(input));
        twDate = new Date(parseFloat(input) + tzOffset);
        if (date > maxTimestamp || date < minTimestamp) {
          return undefined;
        }
      }

      // eslint-disable-next-line consistent-return
      return { date, twDate };
    } catch { /* */ }

    return undefined;
  },

  async generateBoxes(input: string): Promise<Box[]> {
    const match = this.checkMatch(input);
    if (!match) {
      return [];
    }

    const { date, twDate } = match;

    const resp = [];
    if (date.getTime() > 0) {
      resp.push(
        new BoxBuilder('RFC 3339', date.toISOString())
          .setPriority(PriorityRFC3339)
          .setComponent(DefaultBox)
          .build(),
      );
    }
    if (twDate.getTime() > 0) {
      resp.push(
        new BoxBuilder('RFC 3339 (UTC+8)', twDate.toISOString())
          .setPriority(PriorityRFC3339)
          .setComponent(DefaultBox)
          .build(),
      );
    }

    return resp;
  },
};

export default TimestampBoxSource;
