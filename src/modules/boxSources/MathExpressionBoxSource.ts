import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { isJSON, isString, trim } from '@functions/helper';
import type { Box } from '@modules/Box';
import { BoxBuilder } from '@modules/Box';

const PriorityMathExpression = 10;

interface Match {
  answer: string;
}

// cheap pre-screen so mathjs (~600KB) loads only for math-shaped inputs
const MATH_SHAPE = /[+\-*/^%!]|[a-zA-Z]+\s*\(/;

export const MathExpressionBoxSource = {
  name: 'Math Expression',
  description: 'Evaluate mathematical expressions with standard operators.',
  defaultInput: '1 + 2 * (3 + 4) / 5',
  tag: '=',
  kind: 'Compute',
  priority: PriorityMathExpression,

  async checkMatch(input: string): Promise<Match | undefined> {
    if (!isString(input)) {
      return undefined;
    }
    if (input === '' || trim(input) === '') {
      return undefined;
    }

    const regularInput = trim(input);

    // prevent JSON objects/arrays from being evaluated as math expressions
    if (
      (regularInput.startsWith('{') || regularInput.startsWith('[')) &&
      isJSON(regularInput)
    ) {
      return undefined;
    }

    // prevent `mathjs` built-in functions
    if (regularInput === 'random') {
      return undefined;
    }

    if (!/\d/.test(regularInput) || !MATH_SHAPE.test(regularInput)) {
      return undefined;
    }

    try {
      const { evaluate } = await import('mathjs');
      const answer = evaluate(regularInput)?.toString();
      if (
        answer === null ||
        typeof answer === 'object' ||
        typeof answer === 'function'
      ) {
        return undefined;
      }
      if (answer === '[object Object]') {
        return undefined;
      }

      if (answer.replace(/\s/g, '') === regularInput.replace(/\s/g, '')) {
        return undefined;
      }

      return { answer };
    } catch {
      /* */
    }

    return undefined;
  },

  async generateBoxes(input: string): Promise<Box[]> {
    const match = await this.checkMatch(input);
    if (!match) {
      return [];
    }

    const { answer } = match;
    return [
      new BoxBuilder('Math Expression', answer)
        .setTemplate(DefaultBoxTemplate)
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default MathExpressionBoxSource;
