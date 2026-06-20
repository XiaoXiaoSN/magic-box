import { DefaultBoxTemplate } from '@components/BoxTemplate';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// encode each UTF-8 byte as an 8-bit binary string, joined by spaces
function encodeTextToBinary(input: string): string {
  const bytes = new TextEncoder().encode(input);
  return Array.from(bytes)
    .map((b) => b.toString(2).padStart(8, '0'))
    .join(' ');
}

// decode a binary string (space-separated or contiguous) back to text;
// returns null when the input is malformed
function decodeBinaryToText(input: string): string | null {
  const stripped = input.replace(/\s+/g, '');

  if (stripped.length === 0 || stripped.length % 8 !== 0) {
    return null;
  }

  if (!/^[01]+$/.test(stripped)) {
    return null;
  }

  const bytes = new Uint8Array(stripped.length / 8);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(stripped.slice(i * 8, i * 8 + 8), 2);
  }

  return new TextDecoder().decode(bytes);
}

export const BinaryTextBoxSource = {
  name: 'Binary Text',
  description:
    'Convert text to its 8-bit binary representation, or binary back to text.',
  defaultInput: 'hi ::binary',
  tag: '#',
  kind: 'Encode',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const wantEncode = hasOptionKeys(
      options,
      'binary',
      'binaryencode',
      'tobinary',
    );
    const wantDecode = hasOptionKeys(options, 'binarydecode', 'frombinary');

    if (!wantEncode && !wantDecode) return [];
    if (input.length > MAX_INPUT) return [];

    const boxes: Box[] = [];

    if (wantEncode) {
      const binary = encodeTextToBinary(input);
      boxes.push(
        new BoxBuilder('Binary (Encode)', binary)
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      );
    }

    if (wantDecode) {
      const decoded = decodeBinaryToText(input);
      const output =
        decoded !== null
          ? decoded
          : 'Invalid binary input: must be a multiple of 8 bits containing only 0 and 1.';
      boxes.push(
        new BoxBuilder('Binary (Decode)', output)
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      );
    }

    return boxes;
  },
};

export default BinaryTextBoxSource;
