import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { isString, trim } from '@functions/helper';
import type { Box } from '@modules/Box';
import { BoxBuilder } from '@modules/Box';

const PriorityURLEncode = 10;

interface Match {
  decodedText: string;
}

export const URLDecodeBoxSource = {
  name: 'URL Decode',
  description: 'Decode percent-encoded strings.',
  defaultInput:
    'https%3A%2F%2Fgithub.com%2FXiaoXiaoSN%2Fmagic-box%3Ftab%3Dreadme',
  tag: '%',
  kind: 'Decode',
  priority: PriorityURLEncode,

  checkMatch(input: string): Match | undefined {
    if (!isString(input)) {
      return undefined;
    }
    const regularInput = trim(input);

    let decodedText: string;
    try {
      decodedText = decodeURIComponent(regularInput);
      if (decodedText === regularInput) {
        return undefined;
      }
    } catch {
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
      new BoxBuilder('URLEncoding Decode', decodedText)
        .setTemplate(DefaultBoxTemplate)
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default URLDecodeBoxSource;
