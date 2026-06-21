import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// strip trailing zeros and decimal point from a fixed-notation string
function stripTrailingZeros(s: string): string {
  return s.replace(/\.?0+$/, '');
}

// format a number to at most 6 decimal places, keeping integers exact
function formatNum(n: number): string {
  if (Number.isInteger(n)) return n.toString();
  return stripTrailingZeros(n.toFixed(6));
}

// build plaintext k:v representation for headless consumers
function kvToPlaintext(kv: Record<string, string>): string {
  return Object.entries(kv)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

// token pattern: optional sign, digits with optional decimal and/or exponent
const NUM_RE = /[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/g;

export const QuadraticBoxSource = {
  name: 'Quadratic Solver',
  description: 'Solve ax² + bx + c = 0. Input the three coefficients: "a b c".',
  defaultInput: '1 -3 2 ::quadratic',
  tag: '#',
  kind: 'Calculate',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'quadratic', 'quad')) return [];

    const raw = trim(input);
    if (!raw || raw.length > 200) return [];

    const tokens = raw.match(NUM_RE);

    // return an informational box when input cannot be parsed to exactly 3 numbers
    if (!tokens || tokens.length !== 3) {
      const kv: Record<string, string> = {
        Error: 'Expected exactly three coefficients a, b, c (e.g. "1 -3 2").',
        Usage: 'Solves ax² + bx + c = 0',
      };
      return [
        new BoxBuilder('Quadratic Solver', kvToPlaintext(kv))
          .setOptions(kv)
          .setTemplate(KeyValueBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const a = Number.parseFloat(tokens[0]);
    const b = Number.parseFloat(tokens[1]);
    const c = Number.parseFloat(tokens[2]);

    const equation = `${formatNum(a)}x² + ${formatNum(b)}x + ${formatNum(c)} = 0`;

    // degenerate or linear case when a == 0
    if (a === 0) {
      if (b === 0) {
        const kv: Record<string, string> = {
          Equation: equation,
          Error: 'Degenerate: a = 0 and b = 0. No variable to solve for.',
        };
        return [
          new BoxBuilder('Quadratic Solver', kvToPlaintext(kv))
            .setOptions(kv)
            .setTemplate(KeyValueBoxTemplate)
            .setPriority(this.priority)
            .build(),
        ];
      }
      // linear: bx + c = 0 → x = -c / b
      const root = -c / b;
      const kv: Record<string, string> = {
        Equation: equation,
        Note: 'a = 0 — solving as linear equation bx + c = 0',
        'Linear root': formatNum(root),
      };
      return [
        new BoxBuilder('Quadratic Solver', kvToPlaintext(kv))
          .setOptions(kv)
          .setTemplate(KeyValueBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const discriminant = b * b - 4 * a * c;

    if (discriminant > 0) {
      const sqrtD = Math.sqrt(discriminant);
      // root ordering: larger root first ((-b + √D) / 2a when a > 0)
      const root1 = (-b + sqrtD) / (2 * a);
      const root2 = (-b - sqrtD) / (2 * a);
      const kv: Record<string, string> = {
        Equation: equation,
        Discriminant: formatNum(discriminant),
        'Root 1': formatNum(root1),
        'Root 2': formatNum(root2),
      };
      return [
        new BoxBuilder('Quadratic Solver', kvToPlaintext(kv))
          .setOptions(kv)
          .setTemplate(KeyValueBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }

    if (discriminant === 0) {
      const root = -b / (2 * a);
      const kv: Record<string, string> = {
        Equation: equation,
        Discriminant: '0',
        Root: formatNum(root),
      };
      return [
        new BoxBuilder('Quadratic Solver', kvToPlaintext(kv))
          .setOptions(kv)
          .setTemplate(KeyValueBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }

    // discriminant < 0: two complex conjugate roots
    const realPart = -b / (2 * a);
    const imagPart = Math.sqrt(-discriminant) / (2 * a);
    const kv: Record<string, string> = {
      Equation: equation,
      Discriminant: formatNum(discriminant),
      'Root 1': `${formatNum(realPart)} + ${formatNum(imagPart)}i`,
      'Root 2': `${formatNum(realPart)} - ${formatNum(imagPart)}i`,
    };
    return [
      new BoxBuilder('Quadratic Solver', kvToPlaintext(kv))
        .setOptions(kv)
        .setTemplate(KeyValueBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default QuadraticBoxSource;
