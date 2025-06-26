import { evaluate } from 'mathjs';

import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { isString, trim } from '@functions/helper';
import { BoxBuilder } from '@modules/Box';

import type { Box } from '@modules/Box';

const PriorityMathExpression = 10;

interface Match {
  answer: string,
}

export const MathExpressionBoxSource = {
  name: 'Math Expression',
  description: 'Evaluate a mathematical expression.',
  defaultInput: '1 + 2 * (3 + 4) / 5',

  checkMatch(input: string): Match | undefined {
    if (!isString(input)) {
      return undefined;
    }
    if (input === '' || trim(input) === '') {
      return undefined;
    }

    const regularInput = trim(input);

    // prevent `mathjs` built-in functions
    if (regularInput === 'random') {
      return undefined;
    }

    try {
      const answer = evaluate(regularInput)?.toString();
      if (answer === null || typeof answer === 'object' || typeof answer === 'function') {
        return undefined;
      }
      // FIXME: when input is a JSON
      if (answer === '[object Object]') {
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
        .setTemplate(DefaultBoxTemplate)
        .setShowExpandButton(false)
        .setPriority(PriorityMathExpression)
        .build(),
    ];
  },
};

export default MathExpressionBoxSource;
