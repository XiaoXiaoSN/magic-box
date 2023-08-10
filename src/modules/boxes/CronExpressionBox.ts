import { DefaultBox } from '@components/Boxes';
import { isString, toNumeric, trim } from '@functions/helper';
import {
  Box, BoxBuilder, BoxOptions, extractOptionKeys,
} from '@modules/Box';
import cronstrue from 'cronstrue';

const PriorityCronExpression = 10;

interface Match {
  answer: string,
}

export const CronExpressionBoxSource = {
  checkMatch(input: string, options: BoxOptions | null): Match | undefined {
    if (!isString(input)) {
      return undefined;
    }
    if (input === '' || trim(input) === '') {
      return undefined;
    }

    const regularInput = trim(input);

    try {
      let tzOffset = 0;
      if (options !== null) {
        const tzOption = extractOptionKeys(options, 'tz', 'timezone', 'tzOffset');
        const tz = toNumeric(tzOption);
        if (tz !== null && (tz >= -12 && tz <= 14)) {
          tzOffset = tz;
        }
      }

      const answer = cronstrue.toString(regularInput, { use24HourTimeFormat: true, tzOffset });
      if (answer === regularInput) {
        return undefined;
      }

      return { answer };
    } catch { /* */ }

    return undefined;
  },

  async generateBoxes(input: string, options: BoxOptions | null): Promise<Box[]> {
    const match = this.checkMatch(input, options);
    if (!match) {
      return [];
    }

    const { answer } = match;
    return [
      new BoxBuilder('Cron Expression', answer)
        .setPriority(PriorityCronExpression)
        .setComponent(DefaultBox)
        .build(),
    ];
  },
};

export default CronExpressionBoxSource;
