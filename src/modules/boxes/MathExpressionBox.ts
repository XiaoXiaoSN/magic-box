import { DefaultBox } from '@components/Boxes';
import { isString, trim } from '@functions/helper';
import { Box, BoxBuilder } from '@modules/Box';
import { evaluate } from 'mathjs';

interface Match {
  answer: string,
}

export const MathExpressionBoxSource = {
  checkMatch(input: string): Match | undefined {
    if (!isString(input)) {
      return undefined;
    }
    if (input === '' || trim(input) === '') {
      return undefined;
    }

    const regularInput = trim(input);

    try {
      const answer = evaluate(regularInput)?.toString();
      if (answer === null || typeof answer === 'object' || typeof answer === 'function') {
        return undefined;
      }

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
      new BoxBuilder('Math Expression', answer)
        .setComponent(DefaultBox)
        .build(),
    ];
  },
};

export default MathExpressionBoxSource;
