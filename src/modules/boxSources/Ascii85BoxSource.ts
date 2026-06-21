import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { isString, trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// encodes raw bytes to Ascii85 (Adobe variant without <~ ~> framing)
function encodeAscii85(bytes: Uint8Array): string {
  const out: string[] = [];

  for (let i = 0; i < bytes.length; i += 4) {
    const remaining = bytes.length - i;
    const chunkLen = Math.min(4, remaining);

    // pack up to 4 bytes into a uint32 (big-endian), padding with 0
    let val =
      (((bytes[i] ?? 0) << 24) |
        ((bytes[i + 1] ?? 0) << 16) |
        ((bytes[i + 2] ?? 0) << 8) |
        (bytes[i + 3] ?? 0)) >>>
      0;

    // special case: 4 zero bytes → single 'z'
    if (chunkLen === 4 && val === 0) {
      out.push('z');
      continue;
    }

    // encode into 5 base-85 digits
    const digits: number[] = new Array(5);
    for (let d = 4; d >= 0; d--) {
      digits[d] = val % 85;
      val = Math.floor(val / 85);
    }

    // for a partial chunk of n bytes, output n+1 chars
    const outLen = chunkLen + 1;
    for (let d = 0; d < outLen; d++) {
      out.push(String.fromCharCode(digits[d] + 33));
    }
  }

  return out.join('');
}

// decodes Ascii85 string (Adobe variant without <~ ~> framing) to raw bytes
function decodeAscii85(encoded: string): Uint8Array | Error {
  // strip all whitespace characters
  const stripped = encoded.replace(/\s/g, '');

  const out: number[] = [];
  let i = 0;

  while (i < stripped.length) {
    const ch = stripped[i];

    // 'z' expands to 4 zero bytes
    if (ch === 'z') {
      out.push(0, 0, 0, 0);
      i++;
      continue;
    }

    // collect up to 5 chars for a group
    const groupChars: number[] = [];
    for (let g = 0; g < 5 && i + g < stripped.length; g++) {
      const c = stripped.charCodeAt(i + g);
      // valid range is '!' (33) to 'u' (117), but 'z' (122) handled above
      if (c < 33 || c > 117) {
        return new Error(`invalid Ascii85 character: '${stripped[i + g]}'`);
      }
      groupChars.push(c - 33);
    }

    const groupLen = groupChars.length;
    i += groupLen;

    if (groupLen === 1) {
      // a single trailing char is not a valid Ascii85 group
      return new Error('invalid Ascii85: trailing single character');
    }

    // pad the group to 5 with 84 ('u') and decode
    while (groupChars.length < 5) {
      groupChars.push(84);
    }

    let val =
      (groupChars[0] * 85 ** 4 +
        groupChars[1] * 85 ** 3 +
        groupChars[2] * 85 ** 2 +
        groupChars[3] * 85 +
        groupChars[4]) >>>
      0;

    // for n input chars, emit n-1 bytes
    const byteCount = groupLen - 1;
    const bytes: number[] = new Array(4);
    for (let b = 3; b >= 0; b--) {
      bytes[b] = val & 0xff;
      val = (val >>> 8) >>> 0;
    }
    for (let b = 0; b < byteCount; b++) {
      out.push(bytes[b]);
    }
  }

  return new Uint8Array(out);
}

export const Ascii85BoxSource = {
  name: 'Ascii85',
  description:
    'Ascii85 (base85) encode/decode. ::ascii85 to encode, ::ascii85decode to decode.',
  defaultInput: 'hello ::ascii85',
  tag: '#',
  kind: 'Encode',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const wantEncode = hasOptionKeys(options, 'ascii85', 'base85', 'a85');
    const wantDecode = hasOptionKeys(options, 'ascii85decode', 'a85decode');

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
      const encoded = encodeAscii85(bytes);
      boxes.push(
        new BoxBuilder('Ascii85 (Encode)', encoded)
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      );
    }

    if (wantDecode) {
      const result = decodeAscii85(input);

      if (result instanceof Error) {
        boxes.push(
          new BoxBuilder('Ascii85 (Decode)', `Error: ${result.message}`)
            .setTemplate(DefaultBoxTemplate)
            .setShowExpandButton(false)
            .setPriority(this.priority)
            .build(),
        );
      } else {
        const decoded = new TextDecoder().decode(result);
        boxes.push(
          new BoxBuilder('Ascii85 (Decode)', decoded)
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

export default Ascii85BoxSource;
