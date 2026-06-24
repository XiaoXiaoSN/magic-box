import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// max input length to prevent abuse
const MAX_INPUT_LENGTH = 100;

// builds the plaintext kv string for KeyValueBoxTemplate
function kvToPlaintext(kv: Record<string, string>): string {
  return Object.entries(kv)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

// formats a number to at most 4 decimal places, stripping trailing zeros
function formatNumber(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(4).replace(/\.?0+$/, '');
}

interface ParsedPair {
  a: number;
  b: number;
}

// parses two numbers from input separated by ' to ', comma, or whitespace
function parsePair(raw: string): ParsedPair | null {
  // split on ' to ', comma, or one-or-more whitespace characters
  const parts = raw
    .split(/\s+to\s+|,\s*|\s+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (parts.length !== 2) return null;

  const a = Number.parseFloat(parts[0]);
  const b = Number.parseFloat(parts[1]);

  if (Number.isNaN(a) || Number.isNaN(b)) return null;

  return { a, b };
}

export const PercentChangeBoxSource = {
  defaultDisabled: true,
  name: 'Percent Change',
  description:
    'Percentage change between two numbers. Input: "<from> to <to>" or "<from> <to>".',
  defaultInput: '120 to 150 ::pctchange',
  tag: '#',
  kind: 'Calculate',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'pctchange', 'percentchange')) return [];

    const raw = trim(input);
    if (!raw || raw.length > MAX_INPUT_LENGTH) return [];

    const pair = parsePair(raw);

    if (pair === null) {
      const kv = {
        Usage: 'Enter two numbers: "120 to 150", "120,150", or "120 150"',
      };
      return [
        new BoxBuilder('Percent Change', kvToPlaintext(kv))
          .setTemplate(KeyValueBoxTemplate)
          .setOptions(kv)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const { a, b } = pair;

    const change = b - a;

    const percentChange = a === 0 ? null : ((b - a) / a) * 100;

    const direction =
      change > 0 ? 'increase' : change < 0 ? 'decrease' : 'no change';

    const kv: Record<string, string> = {
      From: formatNumber(a),
      To: formatNumber(b),
      Change: formatNumber(change),
      'Percent Change':
        percentChange === null
          ? 'undefined (from is 0)'
          : formatNumber(percentChange),
      Direction: direction,
      ...(a !== 0
        ? {
            Ratio: formatNumber(b / a),
            Of: `${formatNumber((b / a) * 100)}%`,
          }
        : {}),
    };

    return [
      new BoxBuilder('Percent Change', kvToPlaintext(kv))
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(kv)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default PercentChangeBoxSource;
