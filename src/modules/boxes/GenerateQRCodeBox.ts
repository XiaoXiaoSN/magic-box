import { QRCodeBox } from '@components/Boxes';
import { isString, trim } from '@functions/helper';
import {
  Box, BoxBuilder, BoxOptions, isOptionKeys,
} from '@modules/Box';

export const GenerateQRCodeBoxSource = {
  checkMatch(input: string, options: BoxOptions | null): boolean {
    if (options === null) {
      return false;
    }
    if (!isOptionKeys(options, 'surl', 'shorten')) {
      return false;
    }

    if (!isString(input)) {
      return false;
    }
    if (input === '' || trim(input) === '') {
      return false;
    }

    return true;
  },

  async generateBoxes(input: string, options: BoxOptions | null): Promise<Box[]> {
    const match = this.checkMatch(input, options);
    if (!match) {
      return [];
    }

    return [
      new BoxBuilder('QRCode', input)
        .setComponent(QRCodeBox)
        .build(),
    ];
  },
};

export default GenerateQRCodeBoxSource;
