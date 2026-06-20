import { DefaultBoxTemplate } from '@components/BoxTemplate';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

// bound synchronous work; input is seeded from a ?input= url param with no cap
const MAX_INPUT = 100_000;

// char → 5-bit value, built once for an O(1) decode lookup
const DECODE_MAP = new Map([...ALPHABET].map((ch, i) => [ch, i]));

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

// decodes a RFC 4648 Base32 string to raw bytes in a single pass; returns null
// on an invalid character or non-zero padding bits (RFC 4648 §6)
function decodeToBytes(input: string): Uint8Array | null {
  const normalized = input.replace(/\s/g, '').toUpperCase().replace(/=+$/, '');

  // valid base32 quanta leave 0/2/4/5/7 chars; 1/3/6 cannot form whole bytes
  const remainder = normalized.length % 8;
  if (remainder === 1 || remainder === 3 || remainder === 6) return null;

  const bytes: number[] = [];
  let bits = 0;
  let value = 0;

  for (const ch of normalized) {
    const idx = DECODE_MAP.get(ch);
    if (idx === undefined) return null;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((value >>> bits) & 0xff);
    }
  }

  // the leftover low bits must be zero, otherwise the input is malformed
  if (bits > 0 && (value & ((1 << bits) - 1)) !== 0) {
    return null;
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
    if (input.length > MAX_INPUT) return [];

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
