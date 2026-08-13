import { DefaultBoxTemplate } from '@components/BoxTemplate';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
// base58 long-division is O(n²); base58 is meant for small blobs (keys, hashes,
// addresses), so a low cap keeps worst-case work sub-millisecond
const MAX_INPUT = 1_024;

// bitcoin alphabet: excludes 0, O, I, l to avoid visual ambiguity
const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

// precompute decode map for O(1) char lookup
const ALPHABET_MAP: Record<string, number> = {};
for (let i = 0; i < ALPHABET.length; i++) {
  ALPHABET_MAP[ALPHABET[i]] = i;
}

// encodes a byte array to base58 string using long division
function base58EncodeBytes(bytes: Uint8Array): string {
  let leadingZeros = 0;
  for (const b of bytes) {
    if (b !== 0) break;
    leadingZeros++;
  }

  // working copy excluding leading zero bytes; an all-zero input leaves this
  // empty so the loop never runs and we return only the '1' padding (otherwise
  // the division emits a spurious extra '1' and breaks the round-trip)
  const digits = Array.from(bytes.subarray(leadingZeros));
  let result = '';

  while (digits.length > 0) {
    let carry = 0;
    const next: number[] = [];
    for (const byte of digits) {
      carry = carry * 256 + byte;
      const quotient = Math.floor(carry / 58);
      carry = carry % 58;
      if (next.length > 0 || quotient > 0) {
        next.push(quotient);
      }
    }
    result = ALPHABET[carry] + result;
    digits.length = 0;
    for (const v of next) digits.push(v);
  }

  return '1'.repeat(leadingZeros) + result;
}

// decodes a base58 string to a byte array; returns null on invalid input
function base58DecodeBytes(input: string): Uint8Array | null {
  let leadingZeros = 0;
  for (const ch of input) {
    if (ch !== '1') break;
    leadingZeros++;
  }

  // mutable working copy; each element is a base-58 digit value
  const digits: number[] = [];
  for (const ch of input.slice(leadingZeros)) {
    const value = ALPHABET_MAP[ch];
    if (value === undefined) return null;

    let carry = value;
    for (let i = digits.length - 1; i >= 0; i--) {
      carry += digits[i] * 58;
      digits[i] = carry % 256;
      carry = Math.floor(carry / 256);
    }
    while (carry > 0) {
      digits.unshift(carry % 256);
      carry = Math.floor(carry / 256);
    }
  }

  const result = new Uint8Array(leadingZeros + digits.length);
  for (let i = 0; i < digits.length; i++) {
    result[leadingZeros + i] = digits[i];
  }
  return result;
}

export const Base58BoxSource = {
  defaultDisabled: true,
  name: 'Base58',
  description:
    'Encode text to Base58 (Bitcoin alphabet) or decode Base58 back to text.',
  defaultInput: 'Hello World! ::base58',
  tag: '#',
  kind: 'Encode',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const wantEncode = hasOptionKeys(options, 'base58', 'base58encode');
    const wantDecode = hasOptionKeys(options, 'base58decode');
    if (!wantEncode && !wantDecode) return [];
    if (input.length > MAX_INPUT) return [];

    const boxes: Box[] = [];

    if (wantEncode) {
      const bytes = new TextEncoder().encode(input);
      const encoded = base58EncodeBytes(bytes);
      boxes.push(
        new BoxBuilder('Base58 (Encode)', encoded)
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      );
    }

    if (wantDecode) {
      const bytes = base58DecodeBytes(input);
      if (bytes === null) {
        boxes.push(
          new BoxBuilder('Base58 (Decode)', 'invalid Base58 input')
            .setTemplate(DefaultBoxTemplate)
            .setShowExpandButton(false)
            .setPriority(this.priority)
            .build(),
        );
      } else {
        const decoded = new TextDecoder().decode(bytes);
        boxes.push(
          new BoxBuilder('Base58 (Decode)', decoded)
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

export default Base58BoxSource;
