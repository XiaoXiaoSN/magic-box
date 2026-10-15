import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, errorBox, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_DIMENSION_DIGITS = 128;
const MAX_INPUT_LENGTH = MAX_DIMENSION_DIGITS * 2 + 9;
const DIMENSION_RE = /^(\d+)\s*[x:×]\s*(\d+)$/i;

// common aspect ratio names keyed by simplified ratio string
const CommonRatios: Record<string, string> = {
  '16:9': '16:9 Widescreen',
  '4:3': '4:3 Standard',
  '7:3': '21:9 Ultrawide',
  '1:1': '1:1 Square',
  '3:2': '3:2 Classic',
  '8:5': '16:10 Widescreen',
};

function gcd(a: bigint, b: bigint): bigint {
  while (b !== 0n) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
}

function formatDecimal(numerator: bigint, denominator: bigint): string {
  if (
    numerator <= BigInt(Number.MAX_SAFE_INTEGER) &&
    denominator <= BigInt(Number.MAX_SAFE_INTEGER)
  ) {
    const value = Number(numerator) / Number(denominator);
    return Number(value.toPrecision(4)).toString();
  }

  const scale = 1_000_000n;
  const scaled = (numerator * scale + denominator / 2n) / denominator;
  const whole = scaled / scale;
  const fraction = (scaled % scale)
    .toString()
    .padStart(6, '0')
    .replace(/0+$/, '');
  return fraction.length === 0 ? whole.toString() : `${whole}.${fraction}`;
}

function isNearUltrawide(width: bigint, height: bigint): boolean {
  const targetNumerator = 21n;
  const targetDenominator = 9n;
  const difference =
    (width * targetDenominator - height * targetNumerator < 0n
      ? height * targetNumerator - width * targetDenominator
      : width * targetDenominator - height * targetNumerator) * 100n;
  return difference <= width * targetDenominator * 3n;
}

export const AspectRatioBoxSource = {
  defaultDisabled: true,
  name: 'Aspect Ratio',
  description:
    'Simplify width x height into an aspect ratio (e.g. 1920x1080 → 16:9).',
  defaultInput: '1920x1080\n::ratio',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'ratio', 'aspect')) return [];

    const raw = trim(input);
    if (raw.length > MAX_INPUT_LENGTH) {
      return [
        errorBox(
          'Aspect Ratio',
          `Input is too large (dimensions are limited to ${MAX_DIMENSION_DIGITS} digits).`,
          { priority: this.priority },
        ),
      ];
    }

    const match = raw.match(DIMENSION_RE);
    if (!match) return [];
    if (
      match[1].length > MAX_DIMENSION_DIGITS ||
      match[2].length > MAX_DIMENSION_DIGITS
    ) {
      return [
        errorBox(
          'Aspect Ratio',
          `Input is too large: dimensions are limited to ${MAX_DIMENSION_DIGITS} digits.`,
          { priority: this.priority },
        ),
      ];
    }

    const width = BigInt(match[1]);
    const height = BigInt(match[2]);
    if (width <= 0n || height <= 0n) return [];

    const divisor = gcd(width, height);
    const rw = width / divisor;
    const rh = height / divisor;
    const ratioStr = `${rw}:${rh}`;

    const decimal = formatDecimal(width, height);

    const kvOptions: Record<string, string> = {
      Ratio: ratioStr,
      Decimal: decimal,
    };

    const commonName = CommonRatios[ratioStr];
    if (commonName) {
      kvOptions.Common = commonName;
    } else if (ratioStr !== '7:3' && isNearUltrawide(width, height)) {
      kvOptions.Common = '≈21:9 Ultrawide';
    }

    const plaintextOutput = Object.entries(kvOptions)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    return [
      new BoxBuilder('Aspect Ratio', plaintextOutput)
        .setView('keyValue')
        .setOptions(kvOptions)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default AspectRatioBoxSource;
