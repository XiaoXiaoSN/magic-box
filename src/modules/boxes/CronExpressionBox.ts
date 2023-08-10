import { DefaultBox } from '@components/Boxes';
import { isString, trim } from '@functions/helper';
import { Box, BoxBuilder } from '@modules/Box';
import cronstrue from 'cronstrue';

const PriorityCronExpression = 10;

interface Match {
  answer: string,
}

export const CronExpressionBoxSource = {
  checkMatch(input: string): Match | undefined {
    if (!isString(input)) {
      return undefined;
    }
    if (input === '' || trim(input) === '') {
      return undefined;
    }

    const regularInput = trim(input);

    try {
      const answer = cronstrue.toString(regularInput);
      if (answer === regularInput) {
        return undefined;
      }

      return { answer };
    } catch { /* */ }

    return undefined;
  },

  async generateBoxes(input: string): Promise<Box[]> {
    const match = this.checkMatch(input);
    if (!match) {
      return [];
    }

    const { answer } = match;
    return [
      new BoxBuilder('Cron Expressions', answer)
        .setPriority(PriorityCronExpression)
        .setComponent(DefaultBox)
        .build(),
    ];
  },
};

export default CronExpressionBoxSource;
