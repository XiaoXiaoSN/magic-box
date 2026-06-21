import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { isString, trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// encode a byte array to ascii85 (btoa/adobe variant, no <~ ~> delimiters)
function ascii85Encode(bytes: Uint8Array): string {
  let result = '';

  for (let i = 0; i < bytes.length; i += 4) {
    const len = Math.min(4, bytes.length - i);

    // accumulate big-endian uint32 from up to 4 bytes, zero-padding the rest
    let value = 0;
    for (let j = 0; j < 4; j++) {
      value = (value * 256 + (j < len ? bytes[i + j] : 0)) >>> 0;
    }

    // special-case: full 4-byte all-zero group encodes to single 'z'
    if (len === 4 && value === 0) {
      result += 'z';
      continue;
    }

    // extract 5 base-85 digits, most-significant first
    const chars = new Array<string>(5);
    let v = value;
    for (let k = 4; k >= 0; k--) {
      chars[k] = String.fromCharCode((v % 85) + 33);
      v = Math.floor(v / 85);
    }

    // partial group: output only (len + 1) chars, dropping the padding tail
    result += chars.slice(0, len + 1).join('');
  }

  return result;
}

// decode an ascii85 string to bytes; returns null on invalid input
function ascii85Decode(input: string): Uint8Array | null {
  // strip all whitespace first
  let s = input.replace(/\s/g, '');

  // strip optional adobe <~ ~> delimiters
  if (s.startsWith('<~')) s = s.slice(2);
  if (s.endsWith('~>')) s = s.slice(0, -2);

  const output: number[] = [];
  let i = 0;

  while (i < s.length) {
    // 'z' is valid only at a group boundary and expands to 4 zero bytes
    if (s[i] === 'z') {
      output.push(0, 0, 0, 0);
      i++;
      continue;
    }

    const groupLen = Math.min(5, s.length - i);

    // a partial group needs at least 2 chars to produce 1 output byte
    if (groupLen < 2) return null;

    // accumulate value using float64 (safe up to 2^53); 85^5 < 2^53
    let value = 0;
    for (let j = 0; j < groupLen; j++) {
      const digit = s.charCodeAt(i + j) - 33;
      if (digit < 0 || digit > 84) return null;
      value = value * 85 + digit;
    }

    if (groupLen < 5) {
      // pad missing positions with 'u' (84) to complete the group
      for (let j = groupLen; j < 5; j++) {
        value = value * 85 + 84;
      }
      // convert to uint32 and extract (groupLen - 1) bytes
      const u32 = value >>> 0;
      const count = groupLen - 1;
      for (let b = 3; b > 3 - count; b--) {
        output.push((u32 >>> (b * 8)) & 0xff);
      }
    } else {
      // full 5-char group: convert to uint32 and extract all 4 bytes
      const u32 = value >>> 0;
      output.push(
        (u32 >>> 24) & 0xff,
        (u32 >>> 16) & 0xff,
        (u32 >>> 8) & 0xff,
        u32 & 0xff,
      );
    }

    i += groupLen;
  }

  return new Uint8Array(output);
}

export const Ascii85BoxSource = {
  name: 'Ascii85',
  description: 'Encode text to Ascii85 or decode an Ascii85 string.',
  defaultInput: 'hello ::ascii85',
  tag: '#',
  kind: 'Encode',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const wantEncode = hasOptionKeys(options, 'ascii85', 'ascii85encode');
    const wantDecode = hasOptionKeys(options, 'ascii85decode');
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
      const encoded = ascii85Encode(bytes);
      boxes.push(
        new BoxBuilder('Ascii85 (Encode)', encoded)
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      );
    }

    if (wantDecode) {
      const decoded = ascii85Decode(input);
      const output =
        decoded !== null
          ? new TextDecoder().decode(decoded)
          : 'invalid Ascii85';
      boxes.push(
        new BoxBuilder('Ascii85 (Decode)', output)
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      );
    }

    return boxes;
  },
};

export default Ascii85BoxSource;
