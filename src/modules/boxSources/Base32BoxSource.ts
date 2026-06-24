import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { isString, trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// RFC 4648 §6 standard alphabet (no padding char)
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

// reverse lookup: char → 5-bit value
const DECODE_MAP: Record<string, number> = {};
for (let i = 0; i < ALPHABET.length; i++) {
  DECODE_MAP[ALPHABET[i]] = i;
}

/** Encode arbitrary UTF-8 text to RFC 4648 Base32 with '=' padding. */
function base32Encode(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let bits = 0;
  let accumulator = 0;
  let output = '';

  for (const byte of bytes) {
    accumulator = (accumulator << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      output += ALPHABET[(accumulator >> bits) & 0x1f];
    }
  }

  // flush remaining bits (left-aligned in the 5-bit window)
  if (bits > 0) {
    output += ALPHABET[(accumulator << (5 - bits)) & 0x1f];
  }

  // pad to a multiple of 8 per RFC 4648 §6
  while (output.length % 8 !== 0) {
    output += '=';
  }

  return output;
}

/** Decode RFC 4648 Base32 back to UTF-8 text, or throw on invalid input. */
function base32Decode(input: string): string {
  // strip whitespace, uppercase, and trailing padding
  const normalised = input.replace(/\s/g, '').toUpperCase().replace(/=+$/, '');

  let bits = 0;
  let accumulator = 0;
  const bytes: number[] = [];

  for (const ch of normalised) {
    const val = DECODE_MAP[ch];
    if (val === undefined) {
      throw new Error(`invalid Base32 character: '${ch}'`);
    }
    accumulator = (accumulator << 5) | val;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((accumulator >> bits) & 0xff);
    }
  }

  return new TextDecoder().decode(new Uint8Array(bytes));
}

export const Base32BoxSource = {
  defaultDisabled: true,
  name: 'Base32',
  description:
    'RFC 4648 Base32 encode/decode. ::base32 to encode, ::base32decode to decode.',
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
      const encoded = base32Encode(input);
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
        const decoded = base32Decode(input);
        boxes.push(
          new BoxBuilder('Base32 (Decode)', decoded)
            .setTemplate(DefaultBoxTemplate)
            .setShowExpandButton(false)
            .setPriority(this.priority)
            .build(),
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'invalid Base32';
        boxes.push(
          new BoxBuilder('Base32 (Decode)', message)
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
