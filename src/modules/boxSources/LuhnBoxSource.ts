import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// max digits accepted to avoid pathological inputs
const MAX_INPUT_LENGTH = 40;

// computes the Luhn sum for the given digit string.
// positions are counted from the right (1-based). even positions are doubled;
// values > 9 have 9 subtracted.
function luhnSum(digits: string): number {
  let sum = 0;
  const len = digits.length;
  for (let i = 0; i < len; i++) {
    const pos = len - i; // 1-based position from the right
    let d = Number.parseInt(digits[i], 10);
    if (pos % 2 === 0) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum;
}

// computes the check digit that, when appended to `payload`, yields a Luhn-valid number.
// the payload digits shift to positions 2..n+1 once the check digit occupies position 1.
function computeCheckDigit(payload: string): number {
  const len = payload.length;
  let payloadSum = 0;
  for (let i = 0; i < len; i++) {
    const pos = len - i + 1; // +1 because check digit will sit at position 1
    let d = Number.parseInt(payload[i], 10);
    if (pos % 2 === 0) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    payloadSum += d;
  }
  return (10 - (payloadSum % 10)) % 10;
}

export const LuhnBoxSource = {
  name: 'Luhn',
  description:
    'Validate a number with the Luhn (mod-10) algorithm and compute its check digit.',
  defaultInput: '79927398713 ::luhn',
  tag: '#',
  kind: 'Validate',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'luhn')) return [];
    // bound work before the string ops (a valid number is well under this)
    if (input.length > 200) return [];

    // strip spaces and hyphens; require digits only
    const cleaned = trim(input).replace(/[\s-]/g, '');

    if (
      cleaned.length === 0 ||
      cleaned.length > MAX_INPUT_LENGTH ||
      !/^\d+$/.test(cleaned)
    ) {
      return [];
    }

    const sum = luhnSum(cleaned);
    const isValid = sum % 10 === 0;

    // for a valid number the embedded check digit IS its last digit; for an
    // invalid one, report the digit to append to make it valid (avoids the
    // contradictory "Valid: true" + extension-digit display)
    const outputOptions: Record<string, string> = {
      Input: cleaned,
      Valid: String(isValid),
      ...(isValid
        ? { 'Check Digit': cleaned[cleaned.length - 1] }
        : {
            'Check Digit (append to validate)': String(
              computeCheckDigit(cleaned),
            ),
          }),
      Sum: String(sum),
    };

    const plaintextOutput = Object.entries(outputOptions)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    return [
      new BoxBuilder('Luhn', plaintextOutput)
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(outputOptions)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default LuhnBoxSource;
