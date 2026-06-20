import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// card brand prefix/length rules, evaluated in order
interface BrandRule {
  name: string;
  test: (digits: string) => boolean;
}

const BRAND_RULES: BrandRule[] = [
  {
    name: 'Amex',
    test: (d) => (d.startsWith('34') || d.startsWith('37')) && d.length === 15,
  },
  {
    name: 'Mastercard',
    test: (d) => {
      if (d.length !== 16) return false;
      const prefix2 = Number.parseInt(d.slice(0, 2), 10);
      const prefix4 = Number.parseInt(d.slice(0, 4), 10);
      return (
        (prefix2 >= 51 && prefix2 <= 55) || (prefix4 >= 2221 && prefix4 <= 2720)
      );
    },
  },
  {
    name: 'Discover',
    test: (d) => {
      if (d.length !== 16 && d.length !== 19) return false;
      const prefix4 = d.slice(0, 4);
      const prefix3 = d.slice(0, 3);
      const prefix2 = d.slice(0, 2);
      const prefix6 = Number.parseInt(d.slice(0, 6), 10);
      return (
        prefix4 === '6011' ||
        prefix2 === '65' ||
        (prefix3 >= '644' && prefix3 <= '649') ||
        (prefix6 >= 622126 && prefix6 <= 622925)
      );
    },
  },
  {
    name: 'Visa',
    test: (d) =>
      d.startsWith('4') &&
      (d.length === 13 || d.length === 16 || d.length === 19),
  },
];

// implements the Luhn (mod-10) algorithm
function luhn(digits: string): boolean {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number.parseInt(digits[i], 10);
    if (double) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    double = !double;
  }
  return sum % 10 === 0;
}

function detectBrand(digits: string): string {
  for (const rule of BRAND_RULES) {
    if (rule.test(digits)) return rule.name;
  }
  return 'Unknown';
}

export const LuhnBoxSource = {
  name: 'Luhn Check',
  description:
    'Validate a number with the Luhn (mod 10) algorithm and detect the card brand.',
  defaultInput: '4111 1111 1111 1111 ::luhn',
  tag: '#',
  kind: 'Validate',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'luhn')) return [];

    const digits = trim(input).replace(/[\s-]/g, '');

    // no real card number exceeds 19 digits; the 30-cap also bounds work
    if (digits.length < 2 || digits.length > 30 || !/^\d+$/.test(digits)) {
      return [];
    }

    const valid = luhn(digits);
    const brand = valid ? detectBrand(digits) : 'Unknown';

    return [
      new BoxBuilder('Luhn Check', '')
        .setOptions({
          Number: digits,
          Valid: String(valid),
          Brand: brand,
        })
        .setTemplate(KeyValueBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default LuhnBoxSource;
