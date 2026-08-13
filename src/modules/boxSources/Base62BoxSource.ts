import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// standard base62 alphabet: digits, uppercase, then lowercase
const ALPHABET =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const BASE = 62n;

// build reverse lookup once at module init
const CHAR_TO_INDEX = new Map<string, bigint>(
  [...ALPHABET].map((ch, i) => [ch, BigInt(i)]),
);

function encodeBase62(n: bigint): string {
  if (n === 0n) return '0';
  let result = '';
  let value = n;
  while (value > 0n) {
    result = ALPHABET[Number(value % BASE)] + result;
    value /= BASE;
  }
  return result;
}

function decodeBase62(s: string): bigint {
  let value = 0n;
  for (const ch of s) {
    const digit = CHAR_TO_INDEX.get(ch);
    if (digit === undefined) throw new Error(`invalid base62 char: ${ch}`);
    value = value * BASE + digit;
  }
  return value;
}

export const Base62BoxSource = {
  defaultDisabled: true,
  name: 'Base62',
  description:
    'Encode a non-negative integer to Base62, or decode a Base62 string to a number.',
  defaultInput: '123456789 ::base62',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const wantEncode = hasOptionKeys(options, 'base62', 'base62encode');
    const wantDecode = hasOptionKeys(options, 'base62decode');
    if (!wantEncode && !wantDecode) return [];

    // cap input length to avoid DoS on huge strings
    const raw = trim(input).slice(0, 5000);
    const boxes: Box[] = [];

    if (wantEncode) {
      if (!/^\d+$/.test(raw)) {
        boxes.push(
          new BoxBuilder(
            'Base62',
            'Invalid input: a non-negative integer is required for encoding.',
          )
            .setPriority(this.priority)
            .build(),
        );
      } else {
        const decimal = BigInt(raw);
        const encoded = encodeBase62(decimal);
        boxes.push(
          new BoxBuilder('Base62', `Decimal: ${raw}\nBase62: ${encoded}`)
            .setOptions({ Decimal: raw, Base62: encoded })
            .setTemplate(KeyValueBoxTemplate)
            .setPriority(this.priority)
            .build(),
        );
      }
    }

    if (wantDecode) {
      if (!/^[0-9A-Za-z]+$/.test(raw)) {
        boxes.push(
          new BoxBuilder(
            'Base62',
            'Invalid input: only base62 characters (0–9, A–Z, a–z) are allowed.',
          )
            .setPriority(this.priority)
            .build(),
        );
      } else {
        const decoded = decodeBase62(raw);
        boxes.push(
          new BoxBuilder('Base62', `Base62: ${raw}\nDecimal: ${decoded}`)
            .setOptions({ Base62: raw, Decimal: decoded.toString() })
            .setTemplate(KeyValueBoxTemplate)
            .setPriority(this.priority)
            .build(),
        );
      }
    }

    return boxes;
  },
};

export default Base62BoxSource;
