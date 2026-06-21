import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { isString, trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// RFC 4648 Base32 alphabet
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const ALPHABET_SET = new Set(ALPHABET);

// encodes bytes to RFC 4648 Base32 with = padding to a multiple of 8 chars
function encodeBase32(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      output += ALPHABET[(value >> bits) & 0x1f];
    }
  }

  // handle remaining bits by left-aligning them in the final group
  if (bits > 0) {
    output += ALPHABET[(value << (5 - bits)) & 0x1f];
  }

  // pad to a multiple of 8
  while (output.length % 8 !== 0) {
    output += '=';
  }

  return output;
}

// decodes RFC 4648 Base32 string to bytes; throws on invalid characters
function decodeBase32(input: string): Uint8Array {
  const clean = input.toUpperCase().replace(/=+$/, '').replace(/\s/g, '');

  for (const ch of clean) {
    if (!ALPHABET_SET.has(ch)) {
      throw new Error(`invalid Base32 character: ${ch}`);
    }
  }

  const bytes: number[] = [];
  let bits = 0;
  let value = 0;

  for (const ch of clean) {
    value = (value << 5) | ALPHABET.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((value >> bits) & 0xff);
    }
  }

  return new Uint8Array(bytes);
}

export const Base32BoxSource = {
  name: 'Base32',
  description: 'Encode text to Base32 (RFC 4648) or decode a Base32 string.',
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
    if (
      !isString(input) ||
      trim(input).length === 0 ||
      input.length > MAX_INPUT
    )
      return [];

    const boxes: Box[] = [];

    if (wantEncode) {
      const bytes = new TextEncoder().encode(input);
      const encoded = encodeBase32(bytes);
      boxes.push(
        new BoxBuilder('Base32 (Encode)', encoded)
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      );
    }

    if (wantDecode) {
      try {
        const bytes = decodeBase32(input);
        const decoded = new TextDecoder().decode(bytes);
        boxes.push(
          new BoxBuilder('Base32 (Decode)', decoded)
            .setTemplate(DefaultBoxTemplate)
            .setShowExpandButton(false)
            .setPriority(this.priority)
            .build(),
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        boxes.push(
          new BoxBuilder('Base32 (Decode)', `invalid Base32 input: ${message}`)
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
