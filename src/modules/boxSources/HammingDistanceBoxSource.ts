import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// pure hex string (case-insensitive)
const HEX_RE = /^[0-9a-f]+$/i;

// count the number of set bits in a number using Brian Kernighan's algorithm
function popcount(n: number): number {
  let count = 0;
  let v = n;
  while (v !== 0) {
    v &= v - 1;
    count++;
  }
  return count;
}

// compute bit-level hamming distance between two equal-length hex strings
// processes nibble by nibble to avoid bigint overflow on long inputs
function hexBitDistance(a: string, b: string): number {
  let dist = 0;
  for (let i = 0; i < a.length; i++) {
    const na = Number.parseInt(a[i], 16);
    const nb = Number.parseInt(b[i], 16);
    dist += popcount(na ^ nb);
  }
  return dist;
}

// count code points (not UTF-16 units) to handle surrogate pairs correctly
function codePointCount(s: string): number {
  return [...s].length;
}

// compute char-level hamming distance; caller must ensure equal lengths
function charDistance(a: string, b: string): number {
  const aPoints = [...a];
  const bPoints = [...b];
  let dist = 0;
  for (let i = 0; i < aPoints.length; i++) {
    if (aPoints[i] !== bPoints[i]) {
      dist++;
    }
  }
  return dist;
}

export const HammingDistanceBoxSource = {
  name: 'Hamming Distance',
  description:
    'Hamming distance between two equal-length strings. Separate the two with a comma or newline. ::hamming',
  defaultInput: 'karolin, kathrin ::hamming',
  tag: '#',
  kind: 'Calculate',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'hamming')) return [];

    const capped = input.slice(0, MAX_INPUT);

    // prefer newline split; fall back to first comma
    let operands: string[];
    if (capped.includes('\n')) {
      operands = capped
        .split('\n')
        .map(trim)
        .filter((s) => s.length > 0);
    } else {
      const commaIdx = capped.indexOf(',');
      if (commaIdx === -1) {
        operands = [trim(capped)];
      } else {
        operands = [
          trim(capped.slice(0, commaIdx)),
          trim(capped.slice(commaIdx + 1)),
        ];
      }
    }

    if (operands.length < 2) {
      return [
        new BoxBuilder(
          'Hamming Distance',
          'Two strings are required. Separate them with a comma or newline.',
        )
          .setTemplate(KeyValueBoxTemplate)
          .setOptions({
            Error: 'Two strings are required (comma or newline separated).',
          })
          .setPriority(this.priority)
          .build(),
      ];
    }

    const a = operands[0];
    const b = operands[1];
    const lenA = codePointCount(a);
    const lenB = codePointCount(b);

    if (lenA !== lenB) {
      return [
        new BoxBuilder('Hamming Distance', '')
          .setTemplate(KeyValueBoxTemplate)
          .setOptions({
            Error: `Hamming distance requires equal-length strings (got ${lenA} and ${lenB}).`,
            'Length A': String(lenA),
            'Length B': String(lenB),
          })
          .setPriority(this.priority)
          .build(),
      ];
    }

    const distance = charDistance(a, b);
    const kvOptions: Record<string, string> = {
      A: a,
      B: b,
      Length: String(lenA),
      Distance: String(distance),
    };

    // bonus: bit-level distance for equal-length pure-hex inputs
    if (HEX_RE.test(a) && HEX_RE.test(b)) {
      kvOptions['Bit Distance'] = String(hexBitDistance(a, b));
    }

    return [
      new BoxBuilder('Hamming Distance', '')
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(kvOptions)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default HammingDistanceBoxSource;
