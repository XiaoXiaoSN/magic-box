import { DefaultBoxTemplate } from '@components/BoxTemplate';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// encodes UTF-8 bytes to Ascii85 (no <~ ~> delimiters, z-shorthand for zero groups)
function encodeAscii85(input: string): string {
  const bytes = [...new TextEncoder().encode(input)];
  let out = '';

  for (let i = 0; i < bytes.length; i += 4) {
    const group = bytes.slice(i, i + 4);
    const partialLen = group.length;
    while (group.length < 4) group.push(0);

    const val =
      group[0] * 16_777_216 + group[1] * 65_536 + group[2] * 256 + group[3];

    if (partialLen === 4 && val === 0) {
      out += 'z';
    } else {
      const chars = new Array<string>(5);
      let v = val;
      for (let j = 4; j >= 0; j--) {
        chars[j] = String.fromCharCode((v % 85) + 33);
        v = Math.floor(v / 85);
      }
      // for a partial group, keep only (partialLen + 1) chars
      out += chars.slice(0, partialLen + 1).join('');
    }
  }

  return out;
}

// decodes Ascii85 back to a UTF-8 string; returns null on invalid input
function decodeAscii85(input: string): string | null {
  const s = input.replace(/\s/g, '');
  const bytes: number[] = [];

  let i = 0;
  while (i < s.length) {
    if (s[i] === 'z') {
      bytes.push(0, 0, 0, 0);
      i++;
      continue;
    }

    const group = s.slice(i, i + 5);
    i += group.length;
    const partialLen = group.length;

    // a partial group must have at least 2 chars
    if (partialLen === 1) return null;

    // validate all chars are in range '!' (33) to 'u' (117)
    for (const ch of group) {
      const code = ch.charCodeAt(0);
      if (code < 33 || code > 117) return null;
    }

    // pad partial group with 'u' (84 + 33 = 117) to reach 5 chars
    let padded = group;
    while (padded.length < 5) padded += 'u';

    // accumulate base-85 value
    let val = 0;
    for (let j = 0; j < 5; j++) {
      val = val * 85 + (padded.charCodeAt(j) - 33);
    }

    // clamp to uint32 range (overflow means invalid input)
    if (val > 0xffffffff) return null;

    const b0 = (val >>> 24) & 0xff;
    const b1 = (val >>> 16) & 0xff;
    const b2 = (val >>> 8) & 0xff;
    const b3 = val & 0xff;

    // for a full group emit 4 bytes; for a partial group (n chars) emit n-1 bytes
    const emit = [b0, b1, b2, b3].slice(0, partialLen - 1);
    bytes.push(...emit);
  }

  return new TextDecoder().decode(new Uint8Array(bytes));
}

export const Base85BoxSource = {
  name: 'Base85',
  description:
    'Encode text to Ascii85 (Base85) or decode Ascii85 back to text.',
  defaultInput: 'hello ::base85',
  tag: '#',
  kind: 'Encode',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const wantEncode = hasOptionKeys(
      options,
      'base85',
      'base85encode',
      'ascii85',
    );
    const wantDecode = hasOptionKeys(options, 'base85decode');
    if (!wantEncode && !wantDecode) return [];
    if (input.length > MAX_INPUT) return [];

    const boxes: Box[] = [];

    if (wantEncode) {
      const encoded = encodeAscii85(input);
      boxes.push(
        new BoxBuilder('Base85 (Encode)', encoded)
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      );
    }

    if (wantDecode) {
      const decoded = decodeAscii85(input);
      if (decoded === null) {
        boxes.push(
          new BoxBuilder(
            'Base85 (Decode)',
            'Invalid Ascii85 input: contains out-of-range characters.',
          )
            .setTemplate(DefaultBoxTemplate)
            .setShowExpandButton(false)
            .setPriority(this.priority)
            .build(),
        );
      } else {
        boxes.push(
          new BoxBuilder('Base85 (Decode)', decoded)
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

export default Base85BoxSource;
