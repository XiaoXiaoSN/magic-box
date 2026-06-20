import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// max digit length we're willing to handle (~10^39 would overflow quintillions scale)
const MAX_INPUT_LENGTH = 40;

const ones = [
  '',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
];

const tens = [
  '',
  '',
  'twenty',
  'thirty',
  'forty',
  'fifty',
  'sixty',
  'seventy',
  'eighty',
  'ninety',
];

// named scale groups in ascending order (each covers 3 decimal digits)
const scales = [
  '',
  'thousand',
  'million',
  'billion',
  'trillion',
  'quadrillion',
  'quintillion',
];

// convert a value in [0, 999] to english words
function convertHundreds(n: number): string {
  if (n === 0) return '';

  const parts: string[] = [];

  if (n >= 100) {
    parts.push(`${ones[Math.floor(n / 100)]} hundred`);
    n %= 100;
  }

  if (n >= 20) {
    const t = tens[Math.floor(n / 10)];
    const o = ones[n % 10];
    parts.push(o ? `${t}-${o}` : t);
  } else if (n > 0) {
    parts.push(ones[n]);
  }

  return parts.join(' ');
}

// convert a non-negative BigInt to english words
function bigIntToWords(n: bigint): string {
  if (n === 0n) return 'zero';

  const groupSize = 1000n;
  const groups: number[] = [];

  let remaining = n;
  while (remaining > 0n) {
    groups.push(Number(remaining % groupSize));
    remaining /= groupSize;
  }

  if (groups.length > scales.length) {
    // number exceeds quintillions — reject
    return '';
  }

  const parts: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i];
    if (g === 0) continue;

    const words = convertHundreds(g);
    const scale = scales[i];
    parts.push(scale ? `${words} ${scale}` : words);
  }

  return parts.join(' ');
}

export const NumberToWordsBoxSource = {
  name: 'Number to Words',
  description: 'Spell an integer in English words.',
  defaultInput: '1234 ::numwords',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'numwords')) return [];

    const raw = trim(input);

    // reject overly long strings before BigInt parsing
    if (raw.length > MAX_INPUT_LENGTH) return [];

    if (!/^-?\d+$/.test(raw)) return [];

    const negative = raw.startsWith('-');
    const digits = negative ? raw.slice(1) : raw;

    const words = bigIntToWords(BigInt(digits));
    if (!words) {
      return [
        new BoxBuilder(
          'Number to Words',
          'number exceeds the maximum supported scale (999 quintillion)',
        )
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const output = negative ? `negative ${words}` : words;

    return [
      new BoxBuilder('Number to Words', output)
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default NumberToWordsBoxSource;
