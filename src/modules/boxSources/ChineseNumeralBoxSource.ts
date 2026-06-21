import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT_LEN = 64;

// max supported value: 999,999,999,999 (up to 千億)
const MAX_VALUE = 999_999_999_999;

// everyday digit characters (零 is special — used for placeholder zeros)
const everydayDigits = [
  '零',
  '一',
  '二',
  '三',
  '四',
  '五',
  '六',
  '七',
  '八',
  '九',
];
const financialDigits = [
  '零',
  '壹',
  '貳',
  '參',
  '肆',
  '伍',
  '陸',
  '柒',
  '捌',
  '玖',
];

// place-value units: shared for everyday, distinct for financial
const everydayUnits = ['', '十', '百', '千'];
const financialUnits = ['', '拾', '佰', '仟'];

// group-level units (10^4 and 10^8)
const groupUnits = ['', '萬', '億'];

// build k:v plaintext for KeyValueBoxTemplate
function kvToPlaintext(kv: Record<string, string>): string {
  return Object.entries(kv)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

// convert a 4-digit group (0–9999) to Chinese, using the provided digit/unit arrays.
// `isLeadingGroup` controls whether a leading 一 is suppressed for values 10–19 in the
// top-level group (i.e. '十' not '一十' for standalone tens in the outermost group).
function groupToChineseSegment(
  n: number,
  digits: string[],
  units: string[],
  isLeadingGroup: boolean,
): string {
  if (n === 0) return '';

  let result = '';
  const thousands = Math.floor(n / 1000);
  const hundreds = Math.floor((n % 1000) / 100);
  const tens = Math.floor((n % 100) / 10);
  const ones = n % 10;

  if (thousands > 0) {
    result += digits[thousands] + units[3];
  }
  if (hundreds > 0) {
    result += digits[hundreds] + units[2];
  } else if (thousands > 0 && (tens > 0 || ones > 0)) {
    // internal zero: e.g. 1001 → 千零一
    result += digits[0];
  }

  if (tens > 0) {
    // suppress leading 一 for 十–十九 only in the outermost (leading) group
    if (tens === 1 && isLeadingGroup && thousands === 0 && hundreds === 0) {
      result += units[1];
    } else {
      result += digits[tens] + units[1];
    }
  } else if (
    ones > 0 &&
    (thousands > 0 || hundreds > 0) &&
    !result.endsWith(digits[0])
  ) {
    // zero before ones when tens is 0 and a higher digit exists, but only if no zero already emitted
    result += digits[0];
  }

  if (ones > 0) {
    result += digits[ones];
  }

  return result;
}

// convert an integer (0 to MAX_VALUE) to Chinese numerals using the given digit/unit arrays.
function intToChineseNumerals(
  n: number,
  digits: string[],
  units: string[],
): string {
  if (n === 0) return digits[0];

  // split into 億-group, 萬-group, and 個-group
  const yi = Math.floor(n / 100_000_000);
  const wan = Math.floor((n % 100_000_000) / 10_000);
  const ge = n % 10_000;

  const parts: string[] = [];

  if (yi > 0) {
    parts.push(groupToChineseSegment(yi, digits, units, true) + groupUnits[2]);
  }
  if (wan > 0) {
    // insert zero if there's a higher group and wan < 1000 (leading zero)
    if (yi > 0 && wan < 1000) {
      parts.push(digits[0]);
    }
    parts.push(
      groupToChineseSegment(wan, digits, units, yi === 0 && wan < 20) +
        groupUnits[1],
    );
  } else if (yi > 0 && ge > 0) {
    // zero bridge between 億 and 個 groups when 萬 group is absent
    parts.push(digits[0]);
  }

  if (ge > 0) {
    const gePart = groupToChineseSegment(
      ge,
      digits,
      units,
      yi === 0 && wan === 0,
    );

    // zero bridge from 萬 group when ge < 1000 (leading zero in 個 group)
    if (wan > 0 && ge < 1000 && !parts[parts.length - 1]?.endsWith(digits[0])) {
      parts.push(digits[0]);
    }
    parts.push(gePart);
  }

  return parts.join('');
}

// maps everyday Chinese digit characters to their numeric values (for parsing)
const everydayCharMap: Record<string, number> = {
  零: 0,
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
  兩: 2, // colloquial alternative for 二
};

// parse everyday Chinese numeral string to an integer.
// supports 零一二三四五六七八九十百千萬億 and 兩.
// returns null if parsing fails or the string is not recognisable as a Chinese numeral.
//
// algorithm: `pending` holds the most recent digit; a place-value char (十百千) multiplies
// pending and accumulates into `section`; 萬/億 flush (section+pending)×unit into `result`.
function parseChineseToInt(s: string): number | null {
  const chineseNumeralRe = /^[零一二三四五六七八九兩十百千萬億]+$/;
  if (!chineseNumeralRe.test(s)) return null;

  let result = 0; // sum of all completed 萬/億 groups
  let section = 0; // accumulator within the current group
  let pending = 0; // last digit seen, waiting for a place-value multiplier

  for (const ch of s) {
    const dv = everydayCharMap[ch];
    if (dv !== undefined) {
      // digit character — store as pending (零 just resets pending to 0)
      pending = dv;
      continue;
    }

    // place-value multipliers
    if (ch === '十') {
      section += (pending === 0 ? 1 : pending) * 10;
      pending = 0;
    } else if (ch === '百') {
      section += (pending === 0 ? 1 : pending) * 100;
      pending = 0;
    } else if (ch === '千') {
      section += (pending === 0 ? 1 : pending) * 1000;
      pending = 0;
    } else if (ch === '萬') {
      // flush: (section + pending) represents the 萬-multiplier group
      result += (section + pending) * 10_000;
      section = 0;
      pending = 0;
    } else if (ch === '億') {
      result += (section + pending) * 100_000_000;
      section = 0;
      pending = 0;
    } else {
      return null;
    }
  }

  // add any remaining section + unflushed pending digit
  result += section + pending;
  return result;
}

// build k:v plaintext for KeyValueBoxTemplate — helper
function buildIntToChinese(
  n: number,
  negative: boolean,
): { kv: Record<string, string>; plaintext: string } {
  const prefix = negative ? '負' : '';

  const everyday =
    prefix + intToChineseNumerals(n, everydayDigits, everydayUnits);
  const financial =
    prefix + intToChineseNumerals(n, financialDigits, financialUnits);

  const kv: Record<string, string> = {
    Number: `${negative ? '-' : ''}${n}`,
    Everyday: everyday,
    Financial: financial,
  };
  return { kv, plaintext: kvToPlaintext(kv) };
}

export const ChineseNumeralBoxSource = {
  name: 'Chinese Numerals',
  description:
    'Convert an integer to Chinese numerals (everyday and financial), or parse Chinese numerals to an integer.',
  defaultInput: '1234 ::chinesenum',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'chinesenum', 'chinesenumber')) return [];

    const raw = trim(input);
    if (!raw || raw.length > MAX_INPUT_LEN) return [];

    // integer → chinese numeral conversion
    if (/^-?\d+$/.test(raw)) {
      const negative = raw.startsWith('-');
      const abs = Number.parseInt(negative ? raw.slice(1) : raw, 10);

      if (Number.isNaN(abs) || abs > MAX_VALUE) {
        const kv: Record<string, string> = {
          Input: raw,
          Error: `Value out of range (max ±${MAX_VALUE})`,
        };
        return [
          new BoxBuilder('Chinese Numerals', kvToPlaintext(kv))
            .setOptions(kv)
            .setTemplate(KeyValueBoxTemplate)
            .setPriority(this.priority)
            .build(),
        ];
      }

      const { kv, plaintext } = buildIntToChinese(abs, negative);
      return [
        new BoxBuilder('Chinese Numerals', plaintext)
          .setOptions(kv)
          .setTemplate(KeyValueBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }

    // chinese numeral → integer parsing
    const parsed = parseChineseToInt(raw);
    if (parsed === null) {
      // unrecognised input — show an error box so the user knows why no result appeared
      const kv: Record<string, string> = {
        Input: raw,
        Error: 'Cannot parse as integer or Chinese numeral',
      };
      return [
        new BoxBuilder('Chinese Numerals', kvToPlaintext(kv))
          .setOptions(kv)
          .setTemplate(KeyValueBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const kv: Record<string, string> = {
      Chinese: raw,
      Number: String(parsed),
    };
    return [
      new BoxBuilder('Chinese Numerals', kvToPlaintext(kv))
        .setOptions(kv)
        .setTemplate(KeyValueBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default ChineseNumeralBoxSource;
