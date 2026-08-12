import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// build a plaintext representation of key-value pairs for copy/TUI consumers
function kvToPlaintext(pairs: Record<string, string>): string {
  return Object.entries(pairs)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

// parse bit width from option value, defaulting to 8; clamp to [1, 256]
function parseBits(raw: string | boolean | null): bigint {
  if (raw === null || raw === true || raw === false) {
    return 8n;
  }
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n) || n < 1) return 8n;
  if (n > 256) return 256n;
  return BigInt(n);
}

export const TwosComplementBoxSource = {
  defaultDisabled: true,
  name: "Two's Complement",
  description:
    "Show the two's-complement binary/hex of an integer at a bit width. ::twos=<bits> (default 8).",
  defaultInput: '-42 ::twos=8',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'twos', 'twoscomplement')) return [];

    const rawValue = trim(input);

    // validate that input is an integer (optional leading minus, then digits only)
    if (!/^-?\d+$/.test(rawValue)) {
      const kv: Record<string, string> = {
        Error: `"${rawValue}" is not a valid integer`,
      };
      return [
        new BoxBuilder("Two's Complement", kvToPlaintext(kv))
          .setTemplate(KeyValueBoxTemplate)
          .setOptions(kv)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const value = BigInt(rawValue);
    const bits = parseBits(
      extractOptionKeys(options, 'twos', 'twoscomplement'),
    );

    // signed range for a two's-complement integer of `bits` bits
    const minSigned = -(1n << (bits - 1n));
    const maxSigned = (1n << (bits - 1n)) - 1n;

    if (value < minSigned || value > maxSigned) {
      const kv: Record<string, string> = {
        Error: `${rawValue} does not fit in ${bits}-bit signed range [${minSigned}, ${maxSigned}]`,
      };
      return [
        new BoxBuilder("Two's Complement", kvToPlaintext(kv))
          .setTemplate(KeyValueBoxTemplate)
          .setOptions(kv)
          .setPriority(this.priority)
          .build(),
      ];
    }

    // two's-complement bit pattern: negative values wrap around 2^bits
    const pattern = value < 0n ? value + (1n << bits) : value;

    const binary = pattern.toString(2).padStart(Number(bits), '0');
    const hexDigits = Math.ceil(Number(bits) / 4);
    const hex = `0x${pattern.toString(16).padStart(hexDigits, '0')}`;
    const unsigned = pattern.toString(10);

    const kv: Record<string, string> = {
      Value: rawValue,
      Bits: bits.toString(),
      Binary: binary,
      Hex: hex,
      Unsigned: unsigned,
    };

    return [
      new BoxBuilder("Two's Complement", kvToPlaintext(kv))
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(kv)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default TwosComplementBoxSource;
