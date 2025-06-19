import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { isString, trim } from '@functions/helper';
import { BoxBuilder } from '@modules/Box';

import type { Box } from '@modules/Box';

const PriorityRandomBox = 10;
const DEFAULT_MIN = 0;
const DEFAULT_MAX = 100;

interface Match {
  min: number;
  max: number;
}

export const RandomIntegerBoxSource = {
  checkMatch(input: string): Match | undefined {
    if (!isString(input)) {
      return undefined;
    }
    if (input === '' || trim(input) === '') {
      return undefined;
    }

    const regularInput = trim(input);

    // Match pattern like "random 0-100" or "random 0~100" or "random 100" or just "random"
    const match = /^random(?:\s+(\d+)(?:\s*[-~]?\s*(\d+))?)?$/i.exec(regularInput);
    if (!match) {
      return undefined;
    }

    if (!match[1] && !match[2]) {
      return { min: DEFAULT_MIN, max: DEFAULT_MAX };
    }

    // If only one number is provided, use it as max and set min to 0
    if (!match[2]) {
      const max = parseInt(match[1], 10);
      if (max <= 1) {
        return undefined;
      }
      return { min: DEFAULT_MIN, max };
    }

    const min = parseInt(match[1], 10);
    const max = parseInt(match[2], 10);

    if (min >= max) {
      return undefined;
    }

    return { min, max };
  },

  async generateBoxes(input: string): Promise<Box[]> {
    const match = this.checkMatch(input);
    if (!match) {
      return [];
    }

    const array = new Uint32Array(1);
    crypto.getRandomValues(array);

    const randomInRange = Math.floor(
      (array[0] / (0xffffffff + 1)) * (match.max - match.min + 1) + match.min,
    );

    return [
      new BoxBuilder('Random Number', randomInRange.toString())
        .setTemplate(DefaultBoxTemplate)
        .setPriority(PriorityRandomBox)
        .setOptions({
          min: match.min.toString(),
          max: match.max.toString(),
        })
        .build(),
    ];
  },
};

export default RandomIntegerBoxSource;
