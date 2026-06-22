import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// max input length to avoid processing arbitrary long strings
const MAX_INPUT_LENGTH = 20;

interface ZodiacSign {
  name: string;
  symbol: string;
  element: string;
  dates: string;
}

// tropical zodiac sign lookup table ordered by calendar month/day.
// capricorn wraps around year-end so it is checked via month boundary logic.
const SIGNS: ZodiacSign[] = [
  {
    name: 'Capricorn',
    symbol: '♑',
    element: 'Earth',
    dates: 'Dec 22 – Jan 19',
  },
  { name: 'Aquarius', symbol: '♒', element: 'Air', dates: 'Jan 20 – Feb 18' },
  { name: 'Pisces', symbol: '♓', element: 'Water', dates: 'Feb 19 – Mar 20' },
  { name: 'Aries', symbol: '♈', element: 'Fire', dates: 'Mar 21 – Apr 19' },
  { name: 'Taurus', symbol: '♉', element: 'Earth', dates: 'Apr 20 – May 20' },
  { name: 'Gemini', symbol: '♊', element: 'Air', dates: 'May 21 – Jun 20' },
  { name: 'Cancer', symbol: '♋', element: 'Water', dates: 'Jun 21 – Jul 22' },
  { name: 'Leo', symbol: '♌', element: 'Fire', dates: 'Jul 23 – Aug 22' },
  { name: 'Virgo', symbol: '♍', element: 'Earth', dates: 'Aug 23 – Sep 22' },
  { name: 'Libra', symbol: '♎', element: 'Air', dates: 'Sep 23 – Oct 22' },
  { name: 'Scorpio', symbol: '♏', element: 'Water', dates: 'Oct 23 – Nov 21' },
  {
    name: 'Sagittarius',
    symbol: '♐',
    element: 'Fire',
    dates: 'Nov 22 – Dec 21',
  },
];

// each entry: [startMonth, startDay, endMonth, endDay, signIndex in SIGNS]
// capricorn (index 0) spans dec 22 – jan 19 and is handled separately below.
const RANGES: [number, number, number, number, number][] = [
  [1, 20, 2, 18, 1], // aquarius
  [2, 19, 3, 20, 2], // pisces
  [3, 21, 4, 19, 3], // aries
  [4, 20, 5, 20, 4], // taurus
  [5, 21, 6, 20, 5], // gemini
  [6, 21, 7, 22, 6], // cancer
  [7, 23, 8, 22, 7], // leo
  [8, 23, 9, 22, 8], // virgo
  [9, 23, 10, 22, 9], // libra
  [10, 23, 11, 21, 10], // scorpio
  [11, 22, 12, 21, 11], // sagittarius
];

// compare two (month, day) pairs as integers for range checks
function mdGte(month: number, day: number, m2: number, d2: number): boolean {
  return month > m2 || (month === m2 && day >= d2);
}

function mdLte(month: number, day: number, m2: number, d2: number): boolean {
  return month < m2 || (month === m2 && day <= d2);
}

function lookupSign(month: number, day: number): ZodiacSign {
  for (const [sm, sd, em, ed, idx] of RANGES) {
    if (mdGte(month, day, sm, sd) && mdLte(month, day, em, ed)) {
      return SIGNS[idx];
    }
  }
  // capricorn: dec 22 – jan 19 (wraps the year boundary)
  return SIGNS[0];
}

// days in each month; feb 29 is accepted (leap-year tolerance for zodiac purposes)
const DAYS_IN_MONTH = [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function isValidDay(month: number, day: number): boolean {
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > DAYS_IN_MONTH[month]) return false;
  return true;
}

// parse input as MM-DD, MM/DD, YYYY-MM-DD, or YYYY/MM/DD.
// returns [month, day] on success or null when the format is unrecognized.
function parseDate(input: string): [number, number] | null {
  // normalize separators so we handle both '-' and '/'
  const normalized = input.replace(/\//g, '-');

  const fullMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(normalized);
  if (fullMatch) {
    const month = Number.parseInt(fullMatch[2], 10);
    const day = Number.parseInt(fullMatch[3], 10);
    return isValidDay(month, day) ? [month, day] : null;
  }

  const shortMatch = /^(\d{1,2})-(\d{1,2})$/.exec(normalized);
  if (shortMatch) {
    const month = Number.parseInt(shortMatch[1], 10);
    const day = Number.parseInt(shortMatch[2], 10);
    return isValidDay(month, day) ? [month, day] : null;
  }

  return null;
}

// build a k:v plaintext string consumed by KeyValueBoxTemplate
function kvToPlaintext(kv: Record<string, string>): string {
  return Object.entries(kv)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

export const ZodiacBoxSource = {
  name: 'Zodiac Sign',
  description:
    'Determine the Western zodiac sign for a date (MM-DD or YYYY-MM-DD).',
  defaultInput: '03-21 ::zodiac',
  tag: '#',
  kind: 'Calculate',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'zodiac', 'starsign')) return [];

    const raw = trim(input);
    if (raw.length > MAX_INPUT_LENGTH) return [];

    const parsed = parseDate(raw);

    if (parsed === null) {
      // return an informational box so the user knows the input is invalid
      const kv = { Error: `Invalid date "${raw}" — use MM-DD or YYYY-MM-DD` };
      return [
        new BoxBuilder('Zodiac Sign', kvToPlaintext(kv))
          .setTemplate(KeyValueBoxTemplate)
          .setOptions(kv)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const [month, day] = parsed;
    const sign = lookupSign(month, day);
    const mmdd = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const kv: Record<string, string> = {
      Date: mmdd,
      Sign: sign.name,
      Symbol: sign.symbol,
      Element: sign.element,
      Dates: sign.dates,
    };

    return [
      new BoxBuilder('Zodiac Sign', kvToPlaintext(kv))
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(kv)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default ZodiacBoxSource;
