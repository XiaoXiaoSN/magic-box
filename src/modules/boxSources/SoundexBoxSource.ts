import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// maps each letter to its soundex digit; vowels and H/W map to 0 (separators)
const SOUNDEX_MAP: Record<string, string> = {
  A: '0',
  E: '0',
  I: '0',
  O: '0',
  U: '0',
  Y: '0',
  H: '0',
  W: '0',
  B: '1',
  F: '1',
  P: '1',
  V: '1',
  C: '2',
  G: '2',
  J: '2',
  K: '2',
  Q: '2',
  S: '2',
  X: '2',
  Z: '2',
  D: '3',
  T: '3',
  L: '4',
  M: '5',
  N: '5',
  R: '6',
};

// computes the American Soundex code for a single word
function soundex(word: string): string {
  const upper = word.toUpperCase().replace(/[^A-Z]/g, '');
  if (upper.length === 0) return '';

  const first = upper[0];
  const firstCode = SOUNDEX_MAP[first];

  // encode every letter after the first into digits, tracking the previous
  // non-HW code to apply the H/W adjacency collapse rule
  const digits: string[] = [];
  let prevCode = firstCode; // code of the immediately preceding character (H/W transparent)

  for (let i = 1; i < upper.length; i++) {
    const ch = upper[i];
    const code = SOUNDEX_MAP[ch];

    if (ch === 'H' || ch === 'W') {
      // H and W are transparent: they do not update prevCode, so same-code
      // letters on either side collapse as if adjacent
      continue;
    }

    if (code === '0') {
      // vowel acts as a separator: next letter may repeat the previous code
      prevCode = '0';
    } else if (code !== prevCode) {
      digits.push(code);
      prevCode = code;
    }
    // same code as prevCode (and not separated by a vowel) → collapse, skip
  }

  // take at most 3 digits, right-pad with zeros to reach exactly 3
  const suffix = digits.slice(0, 3).join('').padEnd(3, '0');
  return first + suffix;
}

export const SoundexBoxSource = {
  name: 'Soundex',
  description: 'Compute the American Soundex phonetic code of each word.',
  defaultInput: 'Robert Rupert ::soundex',
  tag: '#',
  kind: 'Analyze',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'soundex')) return [];
    if (input.length > 100_000) return [];

    // split on whitespace and keep only tokens that contain at least one letter
    const words = trim(input)
      .split(/\s+/)
      .filter((w) => /[A-Za-z]/.test(w));

    if (words.length === 0) return [];

    // build one key-value entry per word: word → its 4-char soundex code
    const entries: Record<string, string> = {};
    const plainParts: string[] = [];
    for (const word of words) {
      const code = soundex(word);
      entries[word] = code;
      plainParts.push(`${word}: ${code}`);
    }

    return [
      new BoxBuilder('Soundex', plainParts.join(', '))
        .setOptions(entries)
        .setTemplate(KeyValueBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default SoundexBoxSource;
