import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { isString, trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// regex patterns for each supported prefix
const HEX_RE = /^[0-9a-fA-F]+$/;
const OCT_RE = /^[0-7]+$/;
const BIN_RE = /^[01]+$/;
const DEC_RE = /^[0-9]+$/;

// parse the input string into a BigInt, return undefined on invalid input
function parseIntoBigInt(raw: string): bigint | undefined {
  if (raw.length > 256) return undefined;

  const negative = raw.startsWith('-');
  const unsigned = negative ? raw.slice(1) : raw;

  let value: bigint;

  if (unsigned.startsWith('0x') || unsigned.startsWith('0X')) {
    const digits = unsigned.slice(2);
    if (!digits || !HEX_RE.test(digits)) return undefined;
    value = BigInt(`0x${digits}`);
  } else if (unsigned.startsWith('0o') || unsigned.startsWith('0O')) {
    const digits = unsigned.slice(2);
    if (!digits || !OCT_RE.test(digits)) return undefined;
    value = BigInt(`0o${digits}`);
  } else if (unsigned.startsWith('0b') || unsigned.startsWith('0B')) {
    const digits = unsigned.slice(2);
    if (!digits || !BIN_RE.test(digits)) return undefined;
    value = BigInt(`0b${digits}`);
  } else {
    if (!unsigned || !DEC_RE.test(unsigned)) return undefined;
    value = BigInt(unsigned);
  }

  return negative ? -value : value;
}

// format a BigInt into the four base representations
function formatBases(n: bigint): Record<string, string> {
  const negative = n < 0n;
  const abs = negative ? -n : n;
  const sign = negative ? '-' : '';

  return {
    Decimal: `${sign}${abs.toString(10)}`,
    Hex: `${sign}0x${abs.toString(16)}`,
    Octal: `${sign}0o${abs.toString(8)}`,
    Binary: `${sign}0b${abs.toString(2)}`,
  };
}

export const NumberBasesBoxSource = {
  name: 'Number Bases',
  description:
    'Show an integer in binary, octal, decimal, and hex. Accepts 0x, 0o, 0b prefixes.',
  defaultInput: '255 ::bases',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'bases', 'numbase')) return [];
    if (!isString(input)) return [];

    const raw = trim(input);
    const n = parseIntoBigInt(raw);
    if (n === undefined) return [];

    const bases = formatBases(n);

    // key/value lines for headless/TUI consumers (not raw JSON)
    const plaintext = Object.entries(bases)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    return [
      new BoxBuilder('Number Bases', plaintext)
        .setOptions(bases)
        .setTemplate(KeyValueBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default NumberBasesBoxSource;
