import { CodeBoxTemplate } from '@components/BoxTemplate';
import { isString } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 20_000;

// separator line that splits left and right texts
const SEPARATOR = '---';

interface DiffResult {
  added: number;
  removed: number;
  lines: string[];
}

// compute LCS lengths table for two arrays
function lcsTable(left: string[], right: string[]): number[][] {
  const m = left.length;
  const n = right.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (left[i - 1] === right[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  return dp;
}

// backtrack LCS table to produce unified-style diff lines (removals before additions)
function buildDiff(left: string[], right: string[]): DiffResult {
  const dp = lcsTable(left, right);
  const lines: string[] = [];
  let added = 0;
  let removed = 0;
  let i = left.length;
  let j = right.length;

  // collect in reverse then flip
  const reversed: string[] = [];
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && left[i - 1] === right[j - 1]) {
      reversed.push(`  ${left[i - 1]}`);
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      reversed.push(`+ ${right[j - 1]}`);
      added++;
      j--;
    } else {
      reversed.push(`- ${left[i - 1]}`);
      removed++;
      i--;
    }
  }

  reversed.reverse();
  lines.push(...reversed);

  return { added, removed, lines };
}

function computeDiff(input: string): string | null {
  const inputLines = input.split('\n');
  const sepIdx = inputLines.findIndex((line) => line.trim() === SEPARATOR);

  if (sepIdx === -1) {
    return null;
  }

  const left = inputLines.slice(0, sepIdx);
  const right = inputLines.slice(sepIdx + 1);

  const { added, removed, lines } = buildDiff(left, right);
  const summary = `@@ +${added} -${removed} @@`;
  return [summary, ...lines].join('\n');
}

export const TextDiffBoxSource = {
  name: 'Text Diff',
  description:
    'Line diff between two texts separated by a line containing only "---".',
  defaultInput: 'foo\nbar\n---\nfoo\nbaz ::textdiff',
  tag: '#',
  kind: 'Analyze',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'textdiff', 'linediff')) return [];
    if (!isString(input) || input.length > MAX_INPUT) return [];

    const result = computeDiff(input);

    if (result === null) {
      // no separator found — explain the required format
      const message =
        'No separator found. Separate the two texts with a line containing only "---".';
      return [
        new BoxBuilder('Text Diff', message)
          .setOptions({ language: 'diff' })
          .setTemplate(CodeBoxTemplate)
          .setPriority(Priority)
          .build(),
      ];
    }

    return [
      new BoxBuilder('Text Diff', result)
        .setOptions({ language: 'diff' })
        .setTemplate(CodeBoxTemplate)
        .setPriority(Priority)
        .build(),
    ];
  },
};

export default TextDiffBoxSource;
