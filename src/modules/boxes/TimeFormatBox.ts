import { DefaultBox } from '@components/Boxes';
import { isRFC3339, isString, trim } from '@functions/helper';
import { Box, BoxBuilder } from '@modules/Box';

const PriorityTimeFormat = 10;

interface Match {
  timestamp: number,
}

export const TimeFormatBoxSource = {
  checkMatch(input: string): Match | undefined {
    if (!isString(input)) {
      return undefined;
    }
    const regularInput = trim(input);

    if (!isRFC3339(regularInput)) {
      return undefined;
    }

    try {
      const timestamp = Date.parse(regularInput);
      if (timestamp > 0) {
        return { timestamp };
      }
    } catch { /* */ }

    return undefined;
  },

  async generateBoxes(input: string): Promise<Box[]> {
    const match = this.checkMatch(input);
    if (!match) {
      return [];
    }

    const { timestamp } = match;
    return [
      new BoxBuilder('timestamp (s)', (timestamp / 1000).toString())
        .setPriority(PriorityTimeFormat)
        .setComponent(DefaultBox)
        .build(),
      new BoxBuilder('timestamp (ms)', timestamp.toString())
        .setPriority(PriorityTimeFormat)
        .setComponent(DefaultBox)
        .build(),
    ];
  },
};

export default TimeFormatBoxSource;
