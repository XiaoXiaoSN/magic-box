const MAX_INPUT = 20_000;

// separator line that splits left and right texts
const SEPARATOR = '---';

interface DiffResult {
  added: number;
  removed: number;
  lines: string[];
}

// compute LCS lengths table for two arrays
function lcsTable(left: string[], right: string[]): Uint16Array[] {
  const m = left.length;
  const n = right.length;
  const dp = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1));
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

// the LCS table is O(leftLines * rightLines); bound the line count so a
// pathological many-short-lines input within MAX_INPUT can't freeze the page
const MAX_LINES_PER_SIDE = 2_000;

export type DiffOutcome =
  | { ok: true; output: string }
  | { ok: false; message: string };

export function computeDiff(input: string): DiffOutcome {
  const inputLines = input.split('\n');
  const sepIdx = inputLines.findIndex((line) => line.trim() === SEPARATOR);

  if (sepIdx === -1) {
    return {
      ok: false,
      message:
        'No separator found. Separate the two texts with a line containing only "---".',
    };
  }

  const left = inputLines.slice(0, sepIdx);
  const right = inputLines.slice(sepIdx + 1);

  if (left.length > MAX_LINES_PER_SIDE || right.length > MAX_LINES_PER_SIDE) {
    return {
      ok: false,
      message: `Too many lines to diff (limit ${MAX_LINES_PER_SIDE} per side; got ${left.length} / ${right.length}).`,
    };
  }

  const { added, removed, lines } = buildDiff(left, right);
  const summary = `@@ +${added} -${removed} @@`;
  return { ok: true, output: [summary, ...lines].join('\n') };
}

export function compareTexts(leftText: string, rightText: string): DiffOutcome {
  if (leftText.length + rightText.length > MAX_INPUT)
    return {
      ok: false,
      message: 'Text is too large to diff (limit 20000 characters).',
    };
  const left = leftText.replaceAll('\r\n', '\n').split('\n');
  const right = rightText.replaceAll('\r\n', '\n').split('\n');
  if (left.length > MAX_LINES_PER_SIDE || right.length > MAX_LINES_PER_SIDE)
    return {
      ok: false,
      message: 'Too many lines to diff (limit 2000 per side).',
    };
  const { added, removed, lines } = buildDiff(left, right);
  return {
    ok: true,
    output: [`@@ +${added} -${removed} @@`, ...lines].join('\n'),
  };
}
