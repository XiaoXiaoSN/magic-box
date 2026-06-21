import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const DEFAULT_BITS = 8;

// valid signed integer string (no leading zeros beyond single zero, allows negative)
const INTEGER_RE = /^-?\d+$/;

function parseBitWidth(raw: unknown): number {
  // a bare flag (boolean) or any non-string value falls back to the default
  if (typeof raw !== 'string') return DEFAULT_BITS;
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n) || n < 1 || n > 64) return DEFAULT_BITS;
  return n;
}

export const TwosComplementBoxSource = {
  name: "Two's Complement",
  description:
    "Show the two's-complement binary and hex of an integer at a given bit width.",
  defaultInput: '-42 ::twos=8',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'twos', 'twoscomplement')) return [];

    // resolve bit width from the option value, defaulting to 8
    const rawBits = extractOptionKeys(options, 'twos', 'twoscomplement');
    const bits = parseBitWidth(rawBits);

    const trimmed = trim(input);
    // a signed 64-bit integer is at most 20 chars (incl. sign); bound the work
    if (trimmed.length > 20 || !INTEGER_RE.test(trimmed)) return [];

    const v = BigInt(trimmed);
    const bitsN = BigInt(bits);

    // signed range: -(2^(bits-1)) to 2^(bits-1)-1
    const minVal = -(1n << (bitsN - 1n));
    const maxVal = (1n << (bitsN - 1n)) - 1n;

    if (v < minVal || v > maxVal) {
      // out-of-range box explains the constraint
      const rangeDesc = `${minVal} to ${maxVal}`;
      return [
        new BoxBuilder(
          "Two's Complement",
          `${trimmed} does not fit in ${bits} bits (signed range: ${rangeDesc})`,
        )
          .setOptions({
            Error: `${trimmed} does not fit in a signed ${bits}-bit integer`,
            Range: rangeDesc,
          })
          .setTemplate(KeyValueBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }

    // mask to the low `bits` bits — BigInt AND on negatives gives two's-complement pattern
    const mask = (1n << bitsN) - 1n;
    const pattern = v & mask;

    const binary = pattern.toString(2).padStart(bits, '0');
    const hexDigits = Math.ceil(bits / 4);
    const hex = pattern.toString(16).padStart(hexDigits, '0');
    const unsigned = pattern.toString(10);

    return [
      new BoxBuilder("Two's Complement", binary)
        .setOptions({
          Decimal: trimmed,
          Bits: String(bits),
          Binary: binary,
          Hex: hex,
          Unsigned: unsigned,
        })
        .setTemplate(KeyValueBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default TwosComplementBoxSource;
