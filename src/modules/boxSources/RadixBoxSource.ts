import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// converts a non-negative BigInt value to a string in the given base (2-36).
function bigintToBase(value: bigint, base: number): string {
  if (value === 0n) return '0';
  const digits = '0123456789abcdefghijklmnopqrstuvwxyz';
  const b = BigInt(base);
  let result = '';
  let n = value;
  while (n > 0n) {
    result = digits[Number(n % b)] + result;
    n = n / b;
  }
  return result;
}

// parses a string as a non-negative integer in the given base using BigInt arithmetic.
// returns null if any character is not a valid digit for the base.
function parseBaseString(str: string, base: number): bigint | null {
  const b = BigInt(base);
  let result = 0n;
  for (const ch of str) {
    const digit =
      ch >= '0' && ch <= '9'
        ? ch.charCodeAt(0) - 48
        : ch >= 'a' && ch <= 'z'
          ? ch.charCodeAt(0) - 87
          : -1;
    if (digit < 0 || digit >= base) return null;
    result = result * b + BigInt(digit);
  }
  return result;
}

function makeErrorBox(message: string): Box {
  return new BoxBuilder('Radix Convert', message)
    .setTemplate(KeyValueBoxTemplate)
    .setOptions({ Info: message })
    .setPriority(Priority)
    .build();
}

export const RadixBoxSource = {
  name: 'Radix Convert',
  description:
    'Convert an integer between arbitrary bases (2-36). e.g. ::radix=16:2 for hex→binary.',
  defaultInput: 'ff ::radix=16:2',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'radix', 'baseconvert')) return [];
    // BigInt base parsing is O(digits^2); bound it (input is uncapped ?input=)
    if (input.length > 4_000) return [];

    const rawSpec = extractOptionKeys(options, 'radix', 'baseconvert');

    // when the option is present but has no "from:to" value, show usage hint.
    if (
      rawSpec === true ||
      typeof rawSpec !== 'string' ||
      !rawSpec.includes(':')
    ) {
      return [
        makeErrorBox('Usage: ::radix=FROM:TO (e.g. ::radix=16:2), bases 2-36.'),
      ];
    }

    const [fromStr, toStr] = rawSpec.split(':');
    const fromBase = Number.parseInt(fromStr, 10);
    const toBase = Number.parseInt(toStr, 10);

    if (
      Number.isNaN(fromBase) ||
      Number.isNaN(toBase) ||
      fromBase < 2 ||
      fromBase > 36 ||
      toBase < 2 ||
      toBase > 36
    ) {
      return [
        makeErrorBox('Both FROM and TO bases must be integers in range 2-36.'),
      ];
    }

    const rawInput = trim(input);
    const negative = rawInput.startsWith('-');
    const digits = (negative ? rawInput.slice(1) : rawInput).toLowerCase();

    if (!digits) {
      return [
        makeErrorBox(`Input is empty; expected a base-${fromBase} integer.`),
      ];
    }

    const magnitude = parseBaseString(digits, fromBase);
    if (magnitude === null) {
      return [
        makeErrorBox(
          `Input "${rawInput}" contains a digit not valid in base ${fromBase}.`,
        ),
      ];
    }

    const decimal = negative ? -magnitude : magnitude;
    const resultStr =
      (negative && magnitude !== 0n ? '-' : '') +
      bigintToBase(magnitude, toBase);
    const decimalStr = decimal.toString();

    const box = new BoxBuilder('Radix Convert', resultStr)
      .setTemplate(KeyValueBoxTemplate)
      .setOptions({
        Input: rawInput,
        From: `base ${fromBase}`,
        To: `base ${toBase}`,
        Result: resultStr,
        Decimal: decimalStr,
      })
      .setPriority(this.priority)
      .build();

    return [box];
  },
};

export default RadixBoxSource;
