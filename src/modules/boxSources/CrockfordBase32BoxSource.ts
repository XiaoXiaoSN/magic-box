import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { isString } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// Crockford's base32: excludes I, L, O, U to avoid visual confusion; no padding
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

// reverse lookup table; aliases O→0, I→1, L→1 per Crockford spec
const DECODE_MAP: Record<string, number> = {};
for (let i = 0; i < ALPHABET.length; i++) {
  DECODE_MAP[ALPHABET[i]] = i;
}
DECODE_MAP.O = 0;
DECODE_MAP.I = 1;
DECODE_MAP.L = 1;

function crockfordEncode(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let bits = '';
  for (const b of bytes) {
    bits += b.toString(2).padStart(8, '0');
  }
  let result = '';
  for (let i = 0; i < bits.length; i += 5) {
    // pad the final group with trailing zeros if needed
    const group = bits.slice(i, i + 5).padEnd(5, '0');
    result += ALPHABET[Number.parseInt(group, 2)];
  }
  return result;
}

// returns decoded utf-8 string, or null if input contains invalid characters
function crockfordDecode(input: string): string | null {
  // uppercase and strip hyphens (allowed as visual separators per Crockford spec)
  const normalized = input.toUpperCase().replace(/-/g, '');
  let bits = '';
  for (const c of normalized) {
    const val = DECODE_MAP[c];
    if (val === undefined) return null;
    bits += val.toString(2).padStart(5, '0');
  }
  // discard trailing bits that don't form a full byte
  const byteCount = Math.floor(bits.length / 8);
  const bytes = new Uint8Array(byteCount);
  for (let i = 0; i < byteCount; i++) {
    bytes[i] = Number.parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  }
  return new TextDecoder().decode(bytes);
}

export const CrockfordBase32BoxSource = {
  name: 'Crockford Base32',
  description:
    "Encode text to Crockford's Base32 or decode it back (case-insensitive, no padding).",
  defaultInput: 'hello ::crockford',
  tag: '#',
  kind: 'Encode',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const wantEncode = hasOptionKeys(options, 'crockford', 'crockfordencode');
    const wantDecode = hasOptionKeys(options, 'crockforddecode');
    if (!wantEncode && !wantDecode) return [];
    if (!isString(input) || input.length > MAX_INPUT) return [];

    const boxes: Box[] = [];

    if (wantEncode) {
      const encoded = crockfordEncode(input);
      boxes.push(
        new BoxBuilder('Crockford Base32 (Encode)', encoded)
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      );
    }

    if (wantDecode) {
      const decoded = crockfordDecode(input);
      if (decoded === null) {
        boxes.push(
          new BoxBuilder(
            'Crockford Base32 (Decode)',
            'invalid Crockford Base32 input',
          )
            .setTemplate(DefaultBoxTemplate)
            .setShowExpandButton(false)
            .setPriority(this.priority)
            .build(),
        );
      } else {
        boxes.push(
          new BoxBuilder('Crockford Base32 (Decode)', decoded)
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

export default CrockfordBase32BoxSource;
