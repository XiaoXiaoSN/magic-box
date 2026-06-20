import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// parse a string as a bigint, supporting 0x/0o/0b/decimal prefixes and a leading minus sign
function parseIntegerInput(raw: string): bigint | null {
  const s = trim(raw);
  if (s === '' || s === '-') return null;

  const negative = s.startsWith('-');
  const abs = negative ? s.slice(1) : s;

  // bound the digit count: BigInt parse/format is O(n^2) for non-power-of-two
  // bases, so an unbounded string would freeze the main thread (DoS)
  if (abs.length > 1024) return null;

  // BigInt() treats a leading zero as decimal, so rewrite classic C-style octal
  // (e.g. 0755) to the explicit 0o form before parsing
  const normalized = /^0[0-7]+$/.test(abs) ? `0o${abs.slice(1)}` : abs;

  // BigInt() natively handles 0x/0o/0b/decimal literals
  try {
    const value = BigInt(normalized);
    return negative ? -value : value;
  } catch {
    return null;
  }
}

// format a bigint in the requested base with the standard prefix, preserving sign
function formatBigInt(value: bigint, radix: number, prefix: string): string {
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const digits = abs.toString(radix);
  return negative ? `-${prefix}${digits}` : `${prefix}${digits}`;
}

export const NumberBaseBoxSource = {
  name: 'Number Base',
  description:
    'Convert an integer between decimal, hexadecimal, octal and binary. Input may be prefixed 0x / 0o / 0b.',
  defaultInput: '255 ::base',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'base')) return [];

    const value = parseIntegerInput(input);
    if (value === null) return [];

    const decimal = value.toString(10);
    const hex = formatBigInt(value, 16, '0x');
    const octal = formatBigInt(value, 8, '0o');
    const binary = formatBigInt(value, 2, '0b');

    const output: Record<string, string> = {
      Decimal: decimal,
      Hexadecimal: hex,
      Octal: octal,
      Binary: binary,
    };

    // plaintext output joins key=value pairs for copy/TUI display
    const plaintextOutput = Object.entries(output)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    return [
      new BoxBuilder('Number Base', plaintextOutput)
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(output)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default NumberBaseBoxSource;
