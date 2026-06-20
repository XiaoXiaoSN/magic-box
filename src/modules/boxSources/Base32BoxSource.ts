import { DefaultBoxTemplate } from '@components/BoxTemplate';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

// encodes raw bytes to RFC 4648 Base32 with padding
function encodeBytes(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      output += ALPHABET[(value >>> bits) & 0x1f];
    }
  }

  if (bits > 0) {
    output += ALPHABET[(value << (5 - bits)) & 0x1f];
  }

  // pad to a multiple of 8
  while (output.length % 8 !== 0) {
    output += '=';
  }

  return output;
}

// decodes a RFC 4648 Base32 string to raw bytes; returns null on invalid input
function decodeToBytes(input: string): Uint8Array | null {
  const normalized = input.replace(/\s/g, '').toUpperCase().replace(/=+$/, '');

  for (const ch of normalized) {
    if (!ALPHABET.includes(ch)) {
      return null;
    }
  }

  const bytes: number[] = [];
  let bits = 0;
  let value = 0;

  for (const ch of normalized) {
    value = (value << 5) | ALPHABET.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((value >>> bits) & 0xff);
    }
  }

  return new Uint8Array(bytes);
}

export const Base32BoxSource = {
  name: 'Base32',
  description: 'Encode text to RFC 4648 Base32 or decode Base32 back to text.',
  defaultInput: 'hello ::base32',
  tag: '#',
  kind: 'Encode',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const wantEncode = hasOptionKeys(options, 'base32', 'base32encode');
    const wantDecode = hasOptionKeys(options, 'base32decode');
    if (!wantEncode && !wantDecode) return [];

    const boxes: Box[] = [];

    if (wantEncode) {
      const bytes = new TextEncoder().encode(input);
      const encoded = encodeBytes(bytes);
      boxes.push(
        new BoxBuilder('Base32 (Encode)', encoded)
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      );
    }

    if (wantDecode) {
      const decoded = decodeToBytes(input);
      if (decoded === null) {
        boxes.push(
          new BoxBuilder(
            'Base32 (Decode)',
            'invalid Base32 input: contains characters outside the RFC 4648 alphabet',
          )
            .setTemplate(DefaultBoxTemplate)
            .setShowExpandButton(false)
            .setPriority(this.priority)
            .build(),
        );
      } else {
        const text = new TextDecoder().decode(decoded);
        boxes.push(
          new BoxBuilder('Base32 (Decode)', text)
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

export default Base32BoxSource;
