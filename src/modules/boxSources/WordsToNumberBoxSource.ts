import { isString, trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const MAX_INPUT = 1000;

// maps unit words (zero–nineteen) to their numeric values
const UNITS: Record<string, number> = {
  zero: 0,
  a: 1,
  an: 1,
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

interface ParsedGroup {
  value: number;
  next: number;
}

function parseGroup(words: string[], start: number): ParsedGroup | null {
  let index = start;
  const first = words[index];
  let value: number;
  let hasHundred = false;

  if (first === 'hundred') {
    value = 100;
    hasHundred = true;
    index++;
  } else if (Object.hasOwn(UNITS, first)) {
    value = UNITS[first];
    if (value >= 1 && value <= 9 && words[index + 1] === 'hundred') {
      value *= 100;
      hasHundred = true;
      index += 2;
    } else {
      index++;
    }
  } else if (Object.hasOwn(TENS, first)) {
    value = TENS[first];
    index++;
  } else {
    return null;
  }

  if (hasHundred) {
    if (Object.hasOwn(TENS, words[index])) {
      value += TENS[words[index]];
      index++;
      const unit = words[index];
      if (Object.hasOwn(UNITS, unit) && UNITS[unit] >= 1 && UNITS[unit] <= 9) {
        value += UNITS[unit];
        index++;
      }
    } else if (Object.hasOwn(UNITS, words[index])) {
      const unit = UNITS[words[index]];
      if (unit < 1 || unit > 19) return null;
      value += unit;
      index++;
    }
  } else if (value >= 20) {
    const unit = words[index];
    if (Object.hasOwn(UNITS, unit) && UNITS[unit] >= 1 && UNITS[unit] <= 9) {
      value += UNITS[unit];
      index++;
    }
  }

  return { value, next: index };
}

function isScale(word: string): boolean {
  return Object.hasOwn(SCALES, word);
}

function isGroupStart(word: string): boolean {
  return (
    word === 'hundred' ||
    Object.hasOwn(UNITS, word) ||
    Object.hasOwn(TENS, word)
  );
}

function parseWords(words: string[]): ParseResult {
  let negative = false;
  let normalized = words;
  if (words[0] === 'negative' || words[0] === 'minus') {
    negative = true;
    normalized = words.slice(1);
  }

  if (
    normalized.length === 0 ||
    normalized.some((word) => word === 'negative' || word === 'minus')
  ) {
    return { ok: false, unrecognized: words.join(' ') };
  }

  const parsedWords: string[] = [];
  for (let index = 0; index < normalized.length; index++) {
    const word = normalized[index];
    if (word !== 'and') {
      parsedWords.push(word);
      continue;
    }

    const previous = normalized[index - 1];
    const next = normalized[index + 1];
    if (
      (previous !== 'hundred' && !isScale(previous)) ||
      next === undefined ||
      !isGroupStart(next)
    ) {
      return { ok: false, unrecognized: word };
    }
  }

  let total = 0;
  let previousScale = Number.POSITIVE_INFINITY;
  let index = 0;

  while (index < parsedWords.length) {
    const group = parseGroup(parsedWords, index);
    let value = 1;
    if (group) {
      value = group.value;
      index = group.next;
    }

    const scaleWord = parsedWords[index];
    if (scaleWord !== undefined && isScale(scaleWord)) {
      const scale = SCALES[scaleWord];
      if (scale >= previousScale) {
        return { ok: false, unrecognized: scaleWord };
      }
      total += value * scale;
      previousScale = scale;
      index++;
    } else if (group && index === parsedWords.length) {
      total += value;
    } else {
      return {
        ok: false,
        unrecognized: parsedWords[index] ?? words.join(' '),
      };
    }
  }

  if (!Number.isSafeInteger(total)) {
    return { ok: false, unrecognized: words.join(' ') };
  }
  return { ok: true, value: negative ? -total : total };
}

export const WordsToNumberBoxSource = {
  defaultDisabled: true,
  name: 'Words to Number',
  description:
    'Parse English number words into an integer (e.g. "one thousand two hundred" → 1200).',
  defaultInput: 'one million two hundred thirty-four thousand\n::wordstonum',
  tag: '#',
  kind: 'Convert',

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
      .replace(/[,.]/g, '')
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
          .setView('default')
          .setShowExpandButton(false)

          .build(),
      ];
    }

    return [
      new BoxBuilder('Words to Number', String(result.value))
        .setView('default')
        .setShowExpandButton(false)

        .build(),
    ];
  },
};

export default WordsToNumberBoxSource;
