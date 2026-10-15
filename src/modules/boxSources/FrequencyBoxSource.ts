import { isString, trim } from '@functions/helper';
import { compareCodePoints, iterateGraphemes } from '@functions/unicode';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;
const MAX_ROWS = 200;

// counts non-whitespace grapheme clusters and sorts ties by Unicode code point
function computeFrequency(input: string): [string, number][] {
  const counts = new Map<string, number>();
  for (const cluster of iterateGraphemes(input)) {
    if (/^\s+$/u.test(cluster)) continue;
    counts.set(cluster, (counts.get(cluster) ?? 0) + 1);
  }
  return [...counts.entries()].sort(([charA, countA], [charB, countB]) => {
    if (countB !== countA) return countB - countA;
    return compareCodePoints(charA, charB);
  });
}

function buildTable(entries: [string, number][], total: number): string {
  const truncated = entries.length > MAX_ROWS;
  const rows = truncated ? entries.slice(0, MAX_ROWS) : entries;

  const lines = rows.map(([char, count]) => {
    const percent = ((count / total) * 100).toFixed(1);
    return `${char}  ${count}  ${percent}%`;
  });

  if (truncated) {
    lines.push(`... (truncated to ${MAX_ROWS} rows)`);
  }

  return lines.join('\n');
}

export const FrequencyBoxSource = {
  defaultDisabled: true,
  name: 'Frequency',
  description: 'Count character frequencies in the input, sorted by count.',
  defaultInput: 'hello world\n::freq',
  tag: '#',
  kind: 'Analyze',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'freq', 'frequency')) return [];
    if (
      !isString(input) ||
      trim(input).length === 0 ||
      input.length > MAX_INPUT
    )
      return [];

    const entries = computeFrequency(input);
    if (entries.length === 0) return [];

    const total = entries.reduce((sum, [, count]) => sum + count, 0);
    const output = buildTable(entries, total);

    return [
      new BoxBuilder('Frequency', output)
        .setView('code')
        .setShowExpandButton(true)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default FrequencyBoxSource;
