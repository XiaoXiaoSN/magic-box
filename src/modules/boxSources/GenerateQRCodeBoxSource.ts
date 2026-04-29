import { QRCodeBoxTemplate } from '@components/BoxTemplate';
import { isString, trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const PriorityGenerateQRCode = 10;

export const GenerateQRCodeBoxSource = {
  name: 'Generate QR Code',
  description: 'Turn any input into a scannable QR code.',
  defaultInput: `https://mb.10oz.tw/list
::qrcode
`,
  tag: '▦',
  kind: 'Transform',
  priority: PriorityGenerateQRCode,

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
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default GenerateQRCodeBoxSource;
