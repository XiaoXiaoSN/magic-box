import { QRCodeBoxTemplate } from '@components/BoxTemplate';
import { isString, trim } from '@functions/helper';
import {
  Box, BoxBuilder, BoxOptions, hasOptionKeys,
} from '@modules/Box';

const PriorityGenerateQRCode = 10;

export const GenerateQRCodeBoxSource = {
  checkMatch(input: string, options: BoxOptions): boolean {
    if (options === null) {
      return false;
    }
    if (!hasOptionKeys(options, 'qr', 'qrcode')) {
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

  async generateBoxes(input: string, options: BoxOptions): Promise<Box[]> {
    const match = this.checkMatch(input, options);
    if (!match) {
      return [];
    }

    return [
      new BoxBuilder('QRCode', input)
        .setTemplate(QRCodeBoxTemplate)
        .setPriority(PriorityGenerateQRCode)
        .build(),
    ];
  },
};

export default GenerateQRCodeBoxSource;
