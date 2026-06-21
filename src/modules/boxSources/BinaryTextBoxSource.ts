import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { isString, trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// converts each byte to its 8-bit binary string, joined by spaces
function encodeTextToBinary(input: string): string {
  const bytes = new TextEncoder().encode(input);
  return Array.from(bytes)
    .map((b) => b.toString(2).padStart(8, '0'))
    .join(' ');
}

// decodes a binary string (spaces optional) back to UTF-8 text, or returns null on invalid input
function decodeBinaryToText(input: string): string | null {
  const stripped = input.replace(/\s/g, '');
  if (!/^[01]+$/.test(stripped) || stripped.length % 8 !== 0) {
    return null;
  }
  const bytes = new Uint8Array(stripped.length / 8);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(stripped.slice(i * 8, i * 8 + 8), 2);
  }
  return new TextDecoder().decode(bytes);
}

export const BinaryTextBoxSource = {
  name: 'Text to Binary',
  description:
    'Convert text to space-separated 8-bit binary (UTF-8), or binary back to text.',
  defaultInput: 'Hi ::binary',
  tag: '#',
  kind: 'Encode',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const wantEncode = hasOptionKeys(options, 'binary', 'tobinary');
    const wantDecode = hasOptionKeys(options, 'binarydecode', 'frombinary');

    if (!wantEncode && !wantDecode) return [];
    if (
      !isString(input) ||
      trim(input).length === 0 ||
      input.length > MAX_INPUT
    )
      return [];

    const boxes: Box[] = [];

    if (wantEncode) {
      const binary = encodeTextToBinary(input);
      boxes.push(
        new BoxBuilder('Text to Binary', binary)
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      );
    }

    if (wantDecode) {
      const text = decodeBinaryToText(input);
      if (text === null) {
        boxes.push(
          new BoxBuilder(
            'Binary to Text',
            'invalid binary: input must be a multiple of 8 bits containing only 0 and 1',
          )
            .setTemplate(DefaultBoxTemplate)
            .setShowExpandButton(false)
            .setPriority(this.priority)
            .build(),
        );
      } else {
        boxes.push(
          new BoxBuilder('Binary to Text', text)
            .setTemplate(DefaultBoxTemplate)
            .setShowExpandButton(false)
            .setPriority(this.priority)
            .build(),
        );
      }
    }

    return boxes;
  },
};

export default BinaryTextBoxSource;
