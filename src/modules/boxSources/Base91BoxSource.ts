import { isString, trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// basE91 alphabet (91 printable ASCII chars, Joachim Henke's ordering)
const ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!#$%&()*+,./:;<=>?@[]^_`{|}~"';

// precomputed reverse lookup: char → index in ALPHABET, -1 for non-members
const DECODE_TABLE: Int8Array = (() => {
  const table = new Int8Array(256).fill(-1);
  for (let i = 0; i < ALPHABET.length; i++) {
    table[ALPHABET.charCodeAt(i)] = i;
  }
  return table;
})();

// encodes a byte array to a basE91 string using the standard Henke algorithm
function encodeBase91(bytes: Uint8Array): string {
  let b = 0;
  let n = 0;
  const out: string[] = [];

  for (const byte of bytes) {
    b |= byte << n;
    n += 8;
    if (n > 13) {
      let v = b & 8191;
      if (v > 88) {
        b >>= 13;
        n -= 13;
      } else {
        v = b & 16383;
        b >>= 14;
        n -= 14;
      }
      out.push(ALPHABET[v % 91], ALPHABET[(v / 91) | 0]);
    }
  }

  if (n > 0) {
    out.push(ALPHABET[b % 91]);
    if (n > 7 || b > 90) {
      out.push(ALPHABET[(b / 91) | 0]);
    }
  }

  return out.join('');
}

// decodes a basE91 string back to a byte array; non-alphabet chars are skipped per spec
function decodeBase91(encoded: string): Uint8Array {
  let v = -1;
  let b = 0;
  let n = 0;
  const out: number[] = [];

  for (let i = 0; i < encoded.length; i++) {
    const code = encoded.charCodeAt(i);
    // chars above the 256-entry table (e.g. CJK, emoji surrogates) are
    // out of range → undefined, which `< 0` would NOT catch; skip explicitly
    const d = code < 256 ? DECODE_TABLE[code] : -1;
    if (d < 0) continue;

    if (v < 0) {
      v = d;
    } else {
      v += d * 91;
      b |= v << n;
      n += (v & 8191) > 88 ? 13 : 14;
      do {
        out.push(b & 255);
        b >>= 8;
        n -= 8;
      } while (n > 7);
      v = -1;
    }
  }

  if (v >= 0) {
    out.push((b | (v << n)) & 255);
  }

  return new Uint8Array(out);
}

export const Base91BoxSource = {
  defaultDisabled: true,
  name: 'basE91',
  description: 'Encode text to basE91 or decode a basE91 string.',
  defaultInput: 'hello ::base91',
  tag: '#',
  kind: 'Encode',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const wantEncode = hasOptionKeys(options, 'base91', 'base91encode');
    const wantDecode = hasOptionKeys(options, 'base91decode');
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
      const encoded = encodeBase91(bytes);
      boxes.push(
        new BoxBuilder('basE91 (Encode)', encoded)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      );
    }

    if (wantDecode) {
      const bytes = decodeBase91(input);
      const decoded = new TextDecoder().decode(bytes);
      boxes.push(
        new BoxBuilder('basE91 (Decode)', decoded)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      );
    }

    return boxes;
  },
};

export default Base91BoxSource;
