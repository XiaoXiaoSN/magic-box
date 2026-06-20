import { DefaultBoxTemplate } from '@components/BoxTemplate';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// bound synchronous work; input is seeded from a ?input= url param with no cap
const MAX_INPUT = 100_000;

// encode a UTF-8 string to lowercase hex bytes with no separator
function encodeToHex(input: string): string {
  const bytes = new TextEncoder().encode(input);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// decode a hex string to UTF-8 text, or return null if the input is invalid
function decodeFromHex(input: string): string | null {
  // strip optional leading 0x and all whitespace
  const cleaned = input.replace(/^0x/i, '').replace(/\s/g, '');
  if (cleaned.length % 2 !== 0) return null;
  if (!/^[0-9a-fA-F]*$/.test(cleaned)) return null;
  const bytes = new Uint8Array(cleaned.length / 2);
  for (let i = 0; i < cleaned.length; i += 2) {
    bytes[i / 2] = Number.parseInt(cleaned.slice(i, i + 2), 16);
  }
  return new TextDecoder().decode(bytes);
}

export const HexStringBoxSource = {
  name: 'Hex String',
  description:
    'Encode text to its UTF-8 hex bytes, or decode a hex string back to text.',
  defaultInput: 'hello ::hex',
  tag: '#',
  kind: 'Encode',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const wantEncode = hasOptionKeys(options, 'hex', 'hexencode');
    const wantDecode = hasOptionKeys(options, 'hexdecode');
    if (!wantEncode && !wantDecode) return [];
    if (input.length > MAX_INPUT) return [];

    const boxes: Box[] = [];

    if (wantEncode) {
      const hex = encodeToHex(input);
      boxes.push(
        new BoxBuilder('Hex (Encode)', hex)
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      );
    }

    if (wantDecode) {
      const decoded = decodeFromHex(input);
      const output =
        decoded !== null
          ? decoded
          : 'Invalid hex input: must be even-length and contain only hex characters [0-9a-fA-F].';
      boxes.push(
        new BoxBuilder('Hex (Decode)', output)
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      );
    }

    return boxes;
  },
};

export default HexStringBoxSource;
