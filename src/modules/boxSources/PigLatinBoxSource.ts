import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { isString, trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

const VOWELS = /[aeiou]/i;
// matches a contiguous run of ASCII letters (a word token to transform)
const WORD_RE = /[a-zA-Z]+/g;

// moves the leading consonant cluster to the end and appends 'ay'.
// 'y' is treated as a vowel only when it is not the first letter.
function convertWord(word: string): string {
  // words starting with a vowel get 'way' appended
  if (VOWELS.test(word[0])) {
    return `${word}way`;
  }

  // find the split index: first vowel, treating y as vowel after position 0
  let splitAt = word.length; // fallback: all consonants (e.g. "rhythm" has y)
  for (let i = 0; i < word.length; i++) {
    const ch = word[i].toLowerCase();
    if (VOWELS.test(ch) || (i > 0 && ch === 'y')) {
      splitAt = i;
      break;
    }
  }

  const cluster = word.slice(0, splitAt);
  const remainder = word.slice(splitAt);
  return `${remainder}${cluster}ay`;
}

// preserves title-case: if the original started with an uppercase letter, capitalize
// the result's first letter and lowercase the rest.
function applyCase(original: string, converted: string): string {
  if (original.length === 0 || converted.length === 0) return converted;
  const firstOriginal = original[0];
  if (firstOriginal >= 'A' && firstOriginal <= 'Z') {
    return converted[0].toUpperCase() + converted.slice(1).toLowerCase();
  }
  return converted;
}

function toPigLatin(input: string): string {
  return input.replace(WORD_RE, (word) => {
    const converted = convertWord(word.toLowerCase());
    return applyCase(word, converted);
  });
}

export const PigLatinBoxSource = {
  name: 'Pig Latin',
  description: 'Convert English text to Pig Latin.',
  defaultInput: 'hello world ::piglatin',
  tag: '#',
  kind: 'Transform',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'piglatin', 'piglatinencode')) return [];
    if (
      !isString(input) ||
      trim(input).length === 0 ||
      input.length > MAX_INPUT
    )
      return [];

    const result = toPigLatin(input);

    return [
      new BoxBuilder('Pig Latin', result)
        .setTemplate(DefaultBoxTemplate)
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default PigLatinBoxSource;
