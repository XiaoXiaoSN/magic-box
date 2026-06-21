import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// matches a signed decimal integer with optional leading/trailing whitespace
const INTEGER_RE = /^-?\d+$/;

// parse the bit width from the option value, clamped to [1, 64]
function parseBitWidth(raw: BoxOptions): number {
  const val = extractOptionKeys(raw, 'twoscomplement', 'twos');
  if (typeof val === 'string' && /^\d+$/.test(val)) {
    const n = Number.parseInt(val, 10);
    return Math.min(64, Math.max(1, n));
  }
  return 8;
}

export const TwosComplementBoxSource = {
  name: "Two's Complement",
  description:
    "Show the two's-complement binary/hex of a signed integer at a bit width. ::twoscomplement=8 (default 8).",
  defaultInput: '-42 ::twoscomplement=8',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'twoscomplement', 'twos')) return [];

    const raw = trim(input).slice(0, 25);
    if (!INTEGER_RE.test(raw)) return [];

    const width = parseBitWidth(options);
    const widthN = BigInt(width);

    // use BigInt directly on the trimmed string — never go through Number
    const value = BigInt(raw);

    const minVal = -(1n << (widthN - 1n));
    const maxVal = (1n << (widthN - 1n)) - 1n;

    if (value < minVal || value > maxVal) {
      const msg = `${raw} does not fit in a signed ${width}-bit integer (range ${minVal} to ${maxVal}).`;
      const kvOptions: Record<string, string> = {
        Value: raw,
        'Bit Width': String(width),
        Error: msg,
      };
      const plaintext = Object.entries(kvOptions)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n');
      return [
        new BoxBuilder("Two's Complement", plaintext)
          .setTemplate(KeyValueBoxTemplate)
          .setOptions(kvOptions)
          .setPriority(this.priority)
          .build(),
      ];
    }

    // mask to the low `width` bits — for negative BigInt this yields the two's complement pattern
    const mask = (1n << widthN) - 1n;
    const pattern = value & mask;

    const binary = pattern.toString(2).padStart(width, '0');
    const hexLen = Math.ceil(width / 4);
    const hex = `0x${pattern.toString(16).padStart(hexLen, '0')}`;
    const unsigned = pattern.toString(10);

    const kvOptions: Record<string, string> = {
      Value: raw,
      'Bit Width': String(width),
      Binary: binary,
      Hex: hex,
      Unsigned: unsigned,
    };

    const plaintext = Object.entries(kvOptions)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    return [
      new BoxBuilder("Two's Complement", plaintext)
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(kvOptions)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default TwosComplementBoxSource;
