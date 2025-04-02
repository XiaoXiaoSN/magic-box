import { DefaultBox } from '@components/Boxes';
import { Box, BoxBuilder } from '@modules/Box';

const PriorityRandomBox = 10;

interface Match {
  min: number;
  max: number;
}

export const RandomIntegerBoxSource = {
  checkMatch(input: string): Match | undefined {
    // Match pattern like "random 1-100" or "random 1~100" or just "random"
    const match = input.match(/^random(?:\s+(\d+)\s*[-~]*\s*(\d+))?$/i);
    if (!match) {
      return undefined;
    }

    if (!match[1] && !match[2]) {
      return { min: 1, max: 100 };
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
        .setComponent(DefaultBox)
        .setPriority(PriorityRandomBox)
        .build(),
    ];
  },
};

export default RandomIntegerBoxSource;
