import { QRCodeBoxTemplate } from '@components/BoxTemplate';
import { isString, trim } from '@functions/helper';
import { BoxBuilder, hasOptionKeys,
} from '@modules/Box';

import type {
  Box, BoxOptions} from '@modules/Box';

const PriorityGenerateQRCode = 10;

export const GenerateQRCodeBoxSource = {
  name: 'Generate QR Code',
  description: 'Generate a QR code from a string.',
  defaultInput: `https://mb.10oz.tw/list
::qrcode
`,

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
