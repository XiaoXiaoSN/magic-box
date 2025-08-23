import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { isNumeric, trim } from '@functions/helper';
import { BoxBuilder } from '@modules/Box';

import type { Box } from '@modules/Box';

const PriorityRFC3339 = 9;

interface Match {
  date: Date,
  twDate: Date,
}

export const TimestampBoxSource = {
  name: 'Timestamp',
  description: 'Convert a date string to a timestamp.',
  defaultInput: '1735794245',
  priority: PriorityRFC3339,

  checkMatch(input: string): Match | undefined {
    if (!isNumeric(input)) {
      return undefined;
    }

    const twTimezoneOffset = (8 * 60 * 60) * 1000;
    const minTimestamp = new Date('1600-01-01T00:00:00');
    const maxTimestamp = new Date('2099-12-31T23:59:59');

    try {
      const inputNumber = parseFloat(input);
      if (Number.isNaN(inputNumber) || inputNumber < 0) {
        return undefined;
      }

      let date = new Date(inputNumber * 1000);

      // check max and min timestamp
      if (date < minTimestamp) {
        return undefined;
      }
      if (date > maxTimestamp) {
        // guess the big number is a timestamp in ms, convert ms to sec
        date = new Date(inputNumber);
        if (maxTimestamp >= date && date >= minTimestamp) {
          return { date, twDate: new Date(date.getTime() + twTimezoneOffset) };
        }
        return undefined;
      }

      return { date, twDate: new Date(date.getTime() + twTimezoneOffset) };
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
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      );
    }
    if (twDate.getTime() > 0) {
      resp.push(
        new BoxBuilder('RFC 3339 (UTC+8)', twDate.toISOString())
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      );
    }

    return resp;
  },
};

export default TimestampBoxSource;
