import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { isString, trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// digit table for consonant groups per American Soundex standard
const SOUNDEX_TABLE: Record<string, string> = {
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

// vowels that reset adjacency tracking (produce no digit)
const VOWELS = new Set(['A', 'E', 'I', 'O', 'U', 'Y']);

/** Computes the American Soundex code for a single word. Returns null for words with no leading letter. */
function soundex(word: string): string | null {
  const letters = word.toUpperCase().replace(/[^A-Z]/g, '');
  if (letters.length === 0) {
    return null;
  }

  const first = letters[0];
  const firstDigit = SOUNDEX_TABLE[first] ?? '';

  // initialize prev to firstDigit so the first letter's own code is never
  // double-counted when the same consonant group appears next
  let prev = firstDigit;
  let digits = '';

  for (let i = 1; i < letters.length && digits.length < 3; i++) {
    const ch = letters[i];

    // H and W are transparent — skip without resetting adjacency
    if (ch === 'H' || ch === 'W') {
      continue;
    }

    if (VOWELS.has(ch)) {
      // vowels break adjacency so the next same-digit consonant is recorded
      prev = '';
      continue;
    }

    const digit = SOUNDEX_TABLE[ch] ?? '';
    if (digit !== prev) {
      digits += digit;
      prev = digit;
    }
  }

  return (first + digits.padEnd(3, '0')).slice(0, 4);
}

export const SoundexBoxSource = {
  name: 'Soundex',
  description:
    'Compute the American Soundex phonetic code for each word in the input.',
  defaultInput: 'Robert ::soundex',
  tag: '#',
  kind: 'Analyze',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'soundex')) {
      return [];
    }

    if (!isString(input) || trim(input).length === 0) {
      return [];
    }

    if (input.length > MAX_INPUT) {
      return [];
    }

    const tokens = input.split(/\s+/).filter((t) => t.length > 0);

    const lines: string[] = [];
    for (const token of tokens) {
      // only process tokens that begin with an ASCII letter
      if (!/^[A-Za-z]/.test(token)) {
        continue;
      }
      const code = soundex(token);
      if (code !== null) {
        lines.push(`${token} → ${code}`);
      }
    }

    if (lines.length === 0) {
      return [];
    }

    const output = lines.join('\n');

    return [
      new BoxBuilder('Soundex', output)
        .setTemplate(DefaultBoxTemplate)
        .setShowExpandButton(false)
        .setPriority(Priority)
        .build(),
    ];
  },
};

export default SoundexBoxSource;
