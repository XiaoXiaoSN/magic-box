import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// brand detection result
interface CardBrand {
  name: string;
  // whether the card length falls within the brand's valid set
  validLength: boolean;
}

// luhn mod-10 check
function luhnCheck(digits: string): boolean {
  let sum = 0;
  let shouldDouble = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number.parseInt(digits[i], 10);

    if (shouldDouble) {
      d *= 2;
      if (d > 9) d -= 9;
    }

    sum += d;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

// detect card brand from digit string; returns name and whether length is valid for that brand
function detectBrand(digits: string): CardBrand {
  const len = digits.length;
  const prefix4 = Number.parseInt(digits.slice(0, 4), 10);
  const prefix2 = Number.parseInt(digits.slice(0, 2), 10);
  const prefix3 = Number.parseInt(digits.slice(0, 3), 10);

  // Visa: starts with 4, lengths 13/16/19
  if (digits[0] === '4') {
    return {
      name: 'Visa',
      validLength: len === 13 || len === 16 || len === 19,
    };
  }

  // Mastercard: 51-55 or 2221-2720, length 16
  if (
    (prefix2 >= 51 && prefix2 <= 55) ||
    (prefix4 >= 2221 && prefix4 <= 2720)
  ) {
    return { name: 'Mastercard', validLength: len === 16 };
  }

  // American Express: 34 or 37, length 15
  if (prefix2 === 34 || prefix2 === 37) {
    return { name: 'American Express', validLength: len === 15 };
  }

  // Discover: 6011, 65, or 644-649, lengths 16/19
  if (
    digits.startsWith('6011') ||
    prefix2 === 65 ||
    (prefix3 >= 644 && prefix3 <= 649)
  ) {
    return { name: 'Discover', validLength: len === 16 || len === 19 };
  }

  // Diners Club: 36, 38, or 300-305, length 14
  if (prefix2 === 36 || prefix2 === 38 || (prefix3 >= 300 && prefix3 <= 305)) {
    return { name: 'Diners Club', validLength: len === 14 };
  }

  // JCB: 3528-3589, lengths 16-19
  if (prefix4 >= 3528 && prefix4 <= 3589) {
    return { name: 'JCB', validLength: len >= 16 && len <= 19 };
  }

  return { name: 'Unknown', validLength: false };
}

// mask the PAN: show first digit + bullets for middle digits + last 4
function maskPAN(digits: string): string {
  if (digits.length <= 5) {
    // too short to meaningfully mask; replace all but last char
    return '•'.repeat(digits.length - 1) + digits[digits.length - 1];
  }

  const first = digits[0];
  const last4 = digits.slice(-4);
  const middleLen = digits.length - 1 - 4;
  return first + '•'.repeat(middleLen) + last4;
}

export const CreditCardBoxSource = {
  name: 'Credit Card',
  description:
    'Detect the card brand from a number and check Luhn validity (masks the number).',
  defaultInput: '4111111111111111 ::cardtype',
  tag: '#',
  kind: 'Validate',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'cardtype', 'creditcard')) return [];

    // strip spaces and hyphens, leaving only digits
    const cleaned = trim(input).replace(/[\s-]/g, '');

    // if the result is not entirely digits or is outside the valid length range, bail out
    if (!/^\d+$/.test(cleaned)) return [];
    if (cleaned.length < 12 || cleaned.length > 19) return [];

    const brand = detectBrand(cleaned);
    const luhnValid = luhnCheck(cleaned);
    const masked = maskPAN(cleaned);

    // key-value entries displayed in the box
    const kvOptions: Record<string, string> = {
      Masked: masked,
      Brand: brand.name,
      Length: String(cleaned.length),
      'Luhn Valid': String(luhnValid),
    };

    // plaintextOutput as k:v lines (not JSON)
    const plaintextOutput = Object.entries(kvOptions)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    return [
      new BoxBuilder('Credit Card', plaintextOutput)
        .setOptions(kvOptions)
        .setTemplate(KeyValueBoxTemplate)
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default CreditCardBoxSource;
