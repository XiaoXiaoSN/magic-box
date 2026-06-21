import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// short-scale word tables
const ONES = [
  'zero',
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

const TENS = [
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

// named powers in ascending order (index 0 = 10^3, 1 = 10^6, ...)
// short-scale group names; 13 entries cover up to 42 digits (> the 40 cap)
const SCALE = [
  'thousand',
  'million',
  'billion',
  'trillion',
  'quadrillion',
  'quintillion',
  'sextillion',
  'septillion',
  'octillion',
  'nonillion',
  'decillion',
  'undecillion',
  'duodecillion',
];

// spell a value in [0, 999]; caller guarantees this range
function spellHundreds(n: number): string {
  if (n < 20) return ONES[n];
  if (n < 100) {
    const tens = TENS[Math.floor(n / 10)];
    const unit = n % 10;
    return unit === 0 ? tens : `${tens}-${ONES[unit]}`;
  }
  const hundreds = Math.floor(n / 100);
  const remainder = n % 100;
  const base = `${ONES[hundreds]} hundred`;
  return remainder === 0 ? base : `${base} ${spellHundreds(remainder)}`;
}

// split a BigInt into groups of 1000, lowest first
function splitGroups(n: bigint): number[] {
  const groups: number[] = [];
  const thousand = 1000n;
  while (n > 0n) {
    groups.push(Number(n % thousand));
    n = n / thousand;
  }
  return groups;
}

// spell a non-negative BigInt as english words
function spellBigInt(n: bigint): string {
  if (n === 0n) return 'zero';

  const groups = splitGroups(n);
  const parts: string[] = [];

  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i];
    if (g === 0) continue;
    const words = spellHundreds(g);
    if (i === 0) {
      parts.push(words);
    } else {
      parts.push(`${words} ${SCALE[i - 1]}`);
    }
  }

  return parts.join(' ');
}

export const NumberSpellBoxSource = {
  name: 'Number to Words',
  description: 'Spell an integer in English words.',
  defaultInput: '1234567 ::spell',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'spell', 'numwords')) return [];
    // bound work before the regex (a valid number is well under this)
    if (input.length > 100) return [];

    const raw = trim(input);

    // validate: optional leading minus followed by digits only, max 40 digits
    if (!/^-?\d+$/.test(raw)) return [];
    const digits = raw.startsWith('-') ? raw.slice(1) : raw;
    if (digits.length > 40) return [];

    const value = BigInt(raw);
    const negative = value < 0n;
    const spelled = spellBigInt(negative ? -value : value);
    const output = negative ? `negative ${spelled}` : spelled;

    return [
      new BoxBuilder('Number to Words', output)
        .setTemplate(DefaultBoxTemplate)
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default NumberSpellBoxSource;
