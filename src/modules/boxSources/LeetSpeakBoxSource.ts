import { CodeBoxTemplate } from '@components/BoxTemplate';
import { isString, trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// basic leet substitutions — encode direction (letter → digit/symbol)
const TO_LEET: Record<string, string> = {
  a: '4',
  b: '8',
  e: '3',
  g: '6',
  i: '1',
  l: '1',
  o: '0',
  s: '5',
  t: '7',
  z: '2',
};

// reverse map — digit → letter. '1' is ambiguous (both 'i' and 'l' encode to '1');
// 'l' wins because it is defined after 'i' in TO_LEET and overwrites it here.
const FROM_LEET: Record<string, string> = Object.fromEntries(
  Object.entries(TO_LEET).map(([letter, digit]) => [digit, letter]),
);

function encode(input: string): string {
  return input
    .toLowerCase()
    .split('')
    .map((ch) => TO_LEET[ch] ?? ch)
    .join('');
}

function decode(input: string): string {
  return input
    .split('')
    .map((ch) => FROM_LEET[ch] ?? ch)
    .join('');
}

export const LeetSpeakBoxSource = {
  defaultDisabled: true,
  name: 'Leetspeak',
  description:
    'Convert text to leetspeak (h4ck3r) or decode it back. ::leet to encode, ::leetdecode to decode.',
  defaultInput: 'leet ::leet',
  tag: '#',
  kind: 'Transform',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const wantEncode = hasOptionKeys(options, 'leet', 'leetspeak', '1337');
    const wantDecode = hasOptionKeys(options, 'leetdecode', 'unleet');
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
        new BoxBuilder('Leetspeak (Encode)', encode(input))
          .setTemplate(CodeBoxTemplate)
          .setPriority(this.priority)
          .build(),
      );
    }

    if (wantDecode) {
      // decode is approximate — '1' maps to 'l' (not 'i'); other ambiguities may apply
      boxes.push(
        new BoxBuilder('Leetspeak (Decode)', decode(input))
          .setTemplate(CodeBoxTemplate)
          .setPriority(this.priority)
          .build(),
      );
    }

    return boxes;
  },
};

export default LeetSpeakBoxSource;
