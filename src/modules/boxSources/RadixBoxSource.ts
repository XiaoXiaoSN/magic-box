import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys, hasOptionKeys } from '@modules/Box';

const Priority = 10;

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
    .setView('keyValue')
    .setOptions({ Info: message })
    .setPriority(Priority)
    .build();
}

export const RadixBoxSource = {
  defaultDisabled: true,
  name: 'Radix Convert',
  description:
    'Convert an integer between arbitrary bases (2-36). e.g. ::radix=16:2 for hex→binary.',
  defaultInput: 'ff\n::radix=16:2',
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

    const specParts = rawSpec.split(':');
    if (
      specParts.length !== 2 ||
      !specParts.every((part) => /^\d+$/.test(part))
    ) {
      return [
        makeErrorBox('Both FROM and TO bases must be integers in range 2-36.'),
      ];
    }
    const [fromStr, toStr] = specParts;
    const fromBase = Number(fromStr);
    const toBase = Number(toStr);

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
    const unsignedInput = negative ? rawInput.slice(1) : rawInput;
    const prefix = unsignedInput.slice(0, 2).toLowerCase();
    const expectedPrefix =
      fromBase === 16
        ? '0x'
        : fromBase === 2
          ? '0b'
          : fromBase === 8
            ? '0o'
            : null;
    const hasPrefix = /^0[xbo]/i.test(unsignedInput);
    if (hasPrefix && prefix !== expectedPrefix) {
      return [
        makeErrorBox(`Input prefix ${prefix} does not match base ${fromBase}.`),
      ];
    }

    const withoutPrefix = expectedPrefix
      ? unsignedInput.slice(0, 2).toLowerCase() === expectedPrefix
        ? unsignedInput.slice(2)
        : unsignedInput
      : unsignedInput;
    const digits = withoutPrefix.replace(/\s+/g, '').toLowerCase();

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
      (negative && magnitude !== 0n ? '-' : '') + magnitude.toString(toBase);
    const decimalStr = decimal.toString();

    const box = new BoxBuilder('Radix Convert', resultStr)
      .setView('keyValue')
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
