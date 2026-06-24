import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// regex for a valid decimal float literal, including scientific notation and special values
const FLOAT_LITERAL_RE =
  /^-?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$|^-?Infinity$|^NaN$/;

// regex for a hex bit-pattern (8 digits = single, 16 digits = double)
const HEX_PATTERN_RE = /^0x([0-9a-fA-F]+)$/;

// convert an ArrayBuffer to a zero-padded hex string without the 0x prefix
function bufToHex(buf: ArrayBuffer, byteLength: number): string {
  return Array.from(new Uint8Array(buf, 0, byteLength))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// extract the full bit string from the first `byteLength` bytes of a DataView
function toBitString(dv: DataView, byteLength: number): string {
  return Array.from({ length: byteLength }, (_, i) =>
    dv.getUint8(i).toString(2).padStart(8, '0'),
  ).join('');
}

interface DoubleRepr {
  hex: string;
  sign: string;
  exponent: string;
  mantissa: string;
}

interface SingleRepr {
  hex: string;
  sign: string;
  exponent: string;
  mantissa: string;
  /** value after the double→single→double round-trip */
  roundTrip: number;
}

function encodeDouble(value: number): DoubleRepr {
  const buf = new ArrayBuffer(8);
  const dv = new DataView(buf);
  dv.setFloat64(0, value, false);
  const bits = toBitString(dv, 8);
  return {
    hex: `0x${bufToHex(buf, 8)}`,
    sign: bits[0],
    exponent: bits.slice(1, 12),
    mantissa: bits.slice(12),
  };
}

function encodeSingle(value: number): SingleRepr {
  const buf = new ArrayBuffer(4);
  const dv = new DataView(buf);
  dv.setFloat32(0, value, false);
  const bits = toBitString(dv, 4);
  const roundTrip = dv.getFloat32(0, false);
  return {
    hex: `0x${bufToHex(buf, 4)}`,
    sign: bits[0],
    exponent: bits.slice(1, 9),
    mantissa: bits.slice(9),
    roundTrip,
  };
}

function decodeHex(
  hexDigits: string,
): { value: number; type: 'double' | 'single' } | null {
  const len = hexDigits.length;
  if (len === 16) {
    const buf = new ArrayBuffer(8);
    const dv = new DataView(buf);
    for (let i = 0; i < 8; i++) {
      dv.setUint8(i, Number.parseInt(hexDigits.slice(i * 2, i * 2 + 2), 16));
    }
    return { value: dv.getFloat64(0, false), type: 'double' };
  }
  if (len === 8) {
    const buf = new ArrayBuffer(4);
    const dv = new DataView(buf);
    for (let i = 0; i < 4; i++) {
      dv.setUint8(i, Number.parseInt(hexDigits.slice(i * 2, i * 2 + 2), 16));
    }
    return { value: dv.getFloat32(0, false), type: 'single' };
  }
  return null;
}

export const Ieee754BoxSource = {
  defaultDisabled: true,
  name: 'IEEE 754',
  description:
    'Show the IEEE-754 (double + single) bit representation of a number, or decode a hex pattern back to a float.',
  defaultInput: '3.14 ::ieee754',
  tag: '#',
  kind: 'Analyze',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'ieee754', 'floatbits')) return [];

    const raw = trim(input).slice(0, 64);
    if (!raw) return [];

    // check for hex bit-pattern decode (must come before float parse to avoid
    // misidentifying '0x...' as a numeric literal in some environments)
    const hexMatch = HEX_PATTERN_RE.exec(raw);
    if (hexMatch) {
      const hexDigits = hexMatch[1];
      const decoded = decodeHex(hexDigits);
      if (!decoded) return [];

      const kvOptions: Record<string, string> = {
        Hex: `0x${hexDigits}`,
        Value: String(decoded.value),
        Type: decoded.type,
      };

      const plaintext = Object.entries(kvOptions)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n');

      return [
        new BoxBuilder('IEEE 754', plaintext)
          .setTemplate(KeyValueBoxTemplate)
          .setOptions(kvOptions)
          .setPriority(this.priority)
          .build(),
      ];
    }

    // check for a decimal float literal or special values
    if (!FLOAT_LITERAL_RE.test(raw)) return [];

    const value = Number.parseFloat(raw);
    if (
      !Number.isFinite(value) &&
      !Number.isNaN(value) &&
      raw !== 'Infinity' &&
      raw !== '-Infinity'
    ) {
      return [];
    }

    const dbl = encodeDouble(value);
    const sgl = encodeSingle(value);

    const kvOptions: Record<string, string> = {
      Value: String(value),
      'Double (hex)': dbl.hex,
      'Double (bits)': `${dbl.sign} ${dbl.exponent} ${dbl.mantissa}`,
      'Single (hex)': sgl.hex,
      'Single (value)': String(sgl.roundTrip),
    };

    const plaintext = Object.entries(kvOptions)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    return [
      new BoxBuilder('IEEE 754', plaintext)
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(kvOptions)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default Ieee754BoxSource;
