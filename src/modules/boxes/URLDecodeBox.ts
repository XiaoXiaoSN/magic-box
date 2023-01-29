import { DefaultBox } from '@components/Boxes';
import { isString, trim } from '@functions/helper';
import { Box, BoxBuilder } from '@modules/Box';

const PriorityURLEncode = 10;

interface Match {
  decodedText: string,
}

export const URLDecodeBoxSource = {
  checkMatch(input: string): Match | undefined {
    if (!isString(input)) {
      return undefined;
    }
    const regularInput = trim(input);

    const decodedText = decodeURIComponent(regularInput);
    if (decodedText === regularInput) {
      return undefined;
    }

    return { decodedText };
  },

  async generateBoxes(input: string): Promise<Box[]> {
    const match = this.checkMatch(input);
    if (!match) {
      return [];
    }

    const { decodedText } = match;
    return [
      new BoxBuilder('URLEncode decode', decodedText)
        .setPriority(PriorityURLEncode)
        .setComponent(DefaultBox)
        .build(),
    ];
  },
};

export default URLDecodeBoxSource;
