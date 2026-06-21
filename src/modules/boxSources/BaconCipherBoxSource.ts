import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { isString, trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// maps each letter index (0=A … 25=Z) to its 5-char a/b code (0→'a', 1→'b')
const ENCODE_TABLE: string[] = Array.from({ length: 26 }, (_, i) =>
  i.toString(2).padStart(5, '0').replace(/0/g, 'a').replace(/1/g, 'b'),
);

// reverse lookup: a/b code → letter
const DECODE_TABLE: Record<string, string> = Object.fromEntries(
  ENCODE_TABLE.map((code, i) => [code, String.fromCharCode(65 + i)]),
);

function encodeBacon(input: string): string {
  return input
    .toUpperCase()
    .split('')
    .filter((ch) => ch >= 'A' && ch <= 'Z')
    .map((ch) => ENCODE_TABLE[ch.charCodeAt(0) - 65])
    .join(' ');
}

function decodeBacon(input: string): string {
  // normalize: lowercase, collapse whitespace, split into 5-char groups
  const normalized = input.toLowerCase().replace(/\s+/g, '');
  const groups: string[] = [];
  for (let i = 0; i + 5 <= normalized.length; i += 5) {
    groups.push(normalized.slice(i, i + 5));
  }
  return groups
    .map((g) => {
      // skip groups with chars other than a/b
      if (!/^[ab]{5}$/.test(g)) return '';
      return (DECODE_TABLE[g] ?? '').toLowerCase();
    })
    .join('');
}

export const BaconCipherBoxSource = {
  name: 'Bacon Cipher',
  description:
    "Encode text to Bacon's cipher (5-letter A/B groups) or decode it back.",
  defaultInput: 'hello ::bacon',
  tag: '#',
  kind: 'Encode',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const wantEncode = hasOptionKeys(options, 'bacon', 'baconencode');
    const wantDecode = hasOptionKeys(options, 'bacondecode');
    if (!wantEncode && !wantDecode) return [];
    if (
      !isString(input) ||
      trim(input).length === 0 ||
      input.length > MAX_INPUT
    )
      return [];

    const boxes: Box[] = [];

    if (wantEncode) {
      boxes.push(
        new BoxBuilder('Bacon Cipher (Encode)', encodeBacon(input))
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      );
    }

    if (wantDecode) {
      boxes.push(
        new BoxBuilder('Bacon Cipher (Decode)', decodeBacon(input))
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      );
    }

    return boxes;
  },
};

export default BaconCipherBoxSource;
