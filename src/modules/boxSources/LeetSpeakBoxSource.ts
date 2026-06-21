import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { isString, trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// encode map: a→4, e→3, l→1, o→0, s→5, t→7, b→8, g→9
// l→1 is chosen over i→1 so that '1337' round-trips cleanly through decode
const ENCODE_MAP: Record<string, string> = {
  a: '4',
  e: '3',
  l: '1',
  o: '0',
  s: '5',
  t: '7',
  b: '8',
  g: '9',
};

// decode map: inverse of encode map above
const DECODE_MAP: Record<string, string> = {
  '4': 'a',
  '3': 'e',
  '1': 'l',
  '0': 'o',
  '5': 's',
  '7': 't',
  '8': 'b',
  '9': 'g',
};

function encodeLeet(input: string): string {
  const lower = input.toLowerCase();
  let result = '';
  for (let i = 0; i < lower.length; i++) {
    result += ENCODE_MAP[lower[i]] ?? lower[i];
  }
  return result;
}

function decodeLeet(input: string): string {
  let result = '';
  for (let i = 0; i < input.length; i++) {
    result += DECODE_MAP[input[i]] ?? input[i];
  }
  return result;
}

export const LeetSpeakBoxSource = {
  name: 'Leetspeak',
  description:
    'Convert text to leetspeak, or decode common leet back to letters.',
  defaultInput: 'leet ::leet',
  tag: '#',
  kind: 'Transform',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const wantEncode = hasOptionKeys(options, 'leet', 'leetencode');
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
      const box = new BoxBuilder('Leetspeak (Encode)', encodeLeet(input))
        .setTemplate(DefaultBoxTemplate)
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build();
      boxes.push(box);
    }

    if (wantDecode) {
      const box = new BoxBuilder('Leetspeak (Decode)', decodeLeet(input))
        .setTemplate(DefaultBoxTemplate)
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build();
      boxes.push(box);
    }

    return boxes;
  },
};

export default LeetSpeakBoxSource;
