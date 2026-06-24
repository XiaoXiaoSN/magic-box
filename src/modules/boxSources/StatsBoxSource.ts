import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;
// cap on the number of parsed values to bound sort/computation time
const MAX_NUMBERS = 10_000;

// valid numeric token: integer, decimal, or scientific notation
const NUMBER_RE = /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/;

// builds "k: v\n..." plaintext from a key-value record
function kvToPlaintext(kv: Record<string, string>): string {
  return Object.entries(kv)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

// formats a float to at most 6 significant decimal places, stripping trailing zeros
function fmt(n: number): string {
  if (Number.isInteger(n)) return String(n);
  // toPrecision can produce e-notation; use toFixed for reasonable range
  const s = n.toFixed(6);
  // strip trailing zeros after the decimal point
  const stripped = s.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  // a tiny non-zero value rounds to "0" at 6 decimals — fall back to
  // significant-figure notation so it isn't shown as exactly zero
  if (stripped === '0' && n !== 0) return n.toPrecision(4);
  return stripped;
}

// computes population variance of an array with a known mean
function populationVariance(nums: number[], mean: number): number {
  const sumSqDiff = nums.reduce((acc, x) => acc + (x - mean) ** 2, 0);
  return sumSqDiff / nums.length;
}

// returns the median of a pre-sorted array
function median(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

// returns the mode(s) as a formatted string; 'none' when all values are unique
function modeString(nums: number[]): string {
  const freq = new Map<number, number>();
  for (const n of nums) {
    freq.set(n, (freq.get(n) ?? 0) + 1);
  }
  const maxFreq = Math.max(...freq.values());
  if (maxFreq === 1) return 'none';
  const modes = [...freq.entries()]
    .filter(([, count]) => count === maxFreq)
    .map(([val]) => val)
    .sort((a, b) => a - b);
  return modes.map(fmt).join(', ');
}

function makeErrorBox(message: string, priority: number): Box {
  const kv = { Note: message };
  return new BoxBuilder('Statistics', kvToPlaintext(kv))
    .setTemplate(KeyValueBoxTemplate)
    .setOptions(kv)
    .setPriority(priority)
    .build();
}

export const StatsBoxSource = {
  defaultDisabled: true,
  name: 'Statistics',
  description:
    'Descriptive statistics (mean, median, mode, stddev, etc.) of a list of numbers.',
  defaultInput: '2, 4, 4, 4, 5, 5, 7, 9 ::stats',
  tag: '#',
  kind: 'Calculate',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'stats', 'statistics')) return [];

    const raw = trim(input).slice(0, MAX_INPUT);

    // split on commas and/or whitespace, discard empty tokens
    const tokens = raw.split(/[\s,]+/).filter(Boolean);

    if (tokens.length === 0) {
      return [makeErrorBox('A list of numbers is required.', this.priority)];
    }

    const nums: number[] = [];
    for (const token of tokens.slice(0, MAX_NUMBERS)) {
      if (!NUMBER_RE.test(token)) {
        return [makeErrorBox('A list of numbers is required.', this.priority)];
      }
      const n = Number.parseFloat(token);
      if (!Number.isFinite(n)) {
        return [makeErrorBox('A list of numbers is required.', this.priority)];
      }
      nums.push(n);
    }

    if (nums.length === 0) {
      return [makeErrorBox('A list of numbers is required.', this.priority)];
    }

    const sorted = [...nums].sort((a, b) => a - b);
    const count = nums.length;
    const sum = nums.reduce((acc, x) => acc + x, 0);
    const mean = sum / count;
    const med = median(sorted);
    const mode = modeString(nums);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const range = max - min;
    const variance = populationVariance(nums, mean);
    const stdDev = Math.sqrt(variance);

    const kv: Record<string, string> = {
      Count: String(count),
      Sum: fmt(sum),
      Mean: fmt(mean),
      Median: fmt(med),
      Mode: mode,
      Min: fmt(min),
      Max: fmt(max),
      Range: fmt(range),
      Variance: fmt(variance),
      'Std Dev (pop)': fmt(stdDev),
      'Std Dev (sample)':
        count > 1 ? fmt(Math.sqrt((variance * count) / (count - 1))) : 'n/a',
    };

    return [
      new BoxBuilder('Statistics', kvToPlaintext(kv))
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(kv)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default StatsBoxSource;
