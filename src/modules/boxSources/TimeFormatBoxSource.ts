import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { isRFC3339, isString, trim } from '@functions/helper';
import { BoxBuilder } from '@modules/Box';

import type { Box } from '@modules/Box';

const PriorityTimeFormat = 10;

interface Match {
  timestamp: number,
}

export const TimeFormatBoxSource = {
  name: 'Time Format',
  description: 'Format a timestamp or date string.',
  defaultInput: '2025-06-21T19:34:57.530+08:00',
  priority: PriorityTimeFormat,

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
        .setTemplate(DefaultBoxTemplate)
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build(),
      new BoxBuilder('timestamp (ms)', timestamp.toString())
        .setTemplate(DefaultBoxTemplate)
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default TimeFormatBoxSource;
