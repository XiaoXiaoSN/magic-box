import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { isString, trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 1000;

// maps unit words (zero–nineteen) to their numeric values
const UNITS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
};

// maps tens words to their numeric values
const TENS: Record<string, number> = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

// scales that flush the accumulator into the result; 'hundred' is handled
// separately (it multiplies the accumulator) so it's intentionally not here
const SCALES: Record<string, number> = {
  thousand: 1_000,
  million: 1_000_000,
  billion: 1_000_000_000,
  trillion: 1_000_000_000_000,
};

type ParseResult =
  | { ok: true; value: number }
  | { ok: false; unrecognized: string };

/** Converts a list of normalised word tokens into an integer using standard accumulation. */
function parseWords(words: string[]): ParseResult {
  let result = 0;
  let current = 0;
  let negative = false;

  for (const word of words) {
    if (word === 'negative' || word === 'minus') {
      negative = true;
      continue;
    }
    if (word === 'and') {
      continue;
    }

    if (Object.hasOwn(UNITS, word)) {
      current += UNITS[word];
    } else if (Object.hasOwn(TENS, word)) {
      current += TENS[word];
    } else if (word === 'hundred') {
      // hundred multiplies only the sub-hundred accumulator, not the full result
      current = current === 0 ? 100 : current * 100;
    } else if (Object.hasOwn(SCALES, word)) {
      // thousand and above: flush current into result scaled up, then reset current
      result += current * SCALES[word];
      current = 0;
    } else {
      return { ok: false, unrecognized: word };
    }
  }

  result += current;
  return { ok: true, value: negative ? -result : result };
}

export const WordsToNumberBoxSource = {
  defaultDisabled: true,
  name: 'Words to Number',
  description:
    'Parse English number words into an integer (e.g. "one thousand two hundred" → 1200).',
  defaultInput: 'one million two hundred thirty-four thousand ::wordstonum',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'wordstonum', 'wordstonumber')) return [];
    if (
      !isString(input) ||
      trim(input).length === 0 ||
      input.length > MAX_INPUT
    )
      return [];

    // normalise: lowercase, replace hyphens with spaces, split on whitespace
    const words = input
      .toLowerCase()
      .replace(/-/g, ' ')
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0);

    const result = parseWords(words);

    if (!result.ok) {
      return [
        new BoxBuilder(
          'Words to Number',
          `couldn't parse '${result.unrecognized}'`,
        )
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      ];
    }

    return [
      new BoxBuilder('Words to Number', String(result.value))
        .setTemplate(DefaultBoxTemplate)
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default WordsToNumberBoxSource;
