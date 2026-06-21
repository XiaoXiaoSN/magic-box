import { CodeBoxTemplate } from '@components/BoxTemplate';
import { isString } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// strips a trailing \r so both \n and \r\n line endings are handled
function splitLines(input: string): string[] {
  const lines = input
    .split('\n')
    .map((line) => (line.endsWith('\r') ? line.slice(0, -1) : line));
  // a single trailing newline is a terminator, not a phantom blank line that
  // would otherwise sort to the top
  if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop();
  return lines;
}

type SortMode = 'asc' | 'desc' | 'num' | 'numdesc';

function resolveSortMode(raw: string | boolean | null): SortMode {
  if (raw === true || raw === '' || raw === 'asc') return 'asc';
  if (raw === 'desc') return 'desc';
  if (raw === 'num') return 'num';
  if (raw === 'numdesc') return 'numdesc';
  return 'asc';
}

function dedupeLines(lines: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const line of lines) {
    if (!seen.has(line)) {
      seen.add(line);
      result.push(line);
    }
  }
  return result;
}

function sortLines(lines: string[], mode: SortMode): string[] {
  const sorted = [...lines];
  switch (mode) {
    case 'asc':
      sorted.sort((a, b) => a.localeCompare(b));
      break;
    case 'desc':
      sorted.sort((a, b) => b.localeCompare(a));
      break;
    case 'num': {
      sorted.sort((a, b) => {
        const na = Number(a);
        const nb = Number(b);
        const aNaN = Number.isNaN(na);
        const bNaN = Number.isNaN(nb);
        if (aNaN && bNaN) return 0;
        if (aNaN) return 1;
        if (bNaN) return -1;
        return na - nb;
      });
      break;
    }
    case 'numdesc': {
      sorted.sort((a, b) => {
        const na = Number(a);
        const nb = Number(b);
        const aNaN = Number.isNaN(na);
        const bNaN = Number.isNaN(nb);
        if (aNaN && bNaN) return 0;
        if (aNaN) return 1;
        if (bNaN) return -1;
        return nb - na;
      });
      break;
    }
  }
  return sorted;
}

export const SortLinesBoxSource = {
  name: 'Sort Lines',
  description:
    'Sort lines of text (::sortlines, ::sortlines=desc, ::sortlines=num) and/or remove duplicates (::uniqlines).',
  defaultInput: 'banana\napple\ncherry\napple ::sortlines',
  tag: '#',
  kind: 'Transform',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const wantSort = hasOptionKeys(options, 'sortlines');
    const wantUniq = hasOptionKeys(options, 'uniqlines', 'dedupelines');
    if (!wantSort && !wantUniq) return [];
    if (!isString(input) || input.length === 0 || input.length > MAX_INPUT)
      return [];

    let lines = splitLines(input);

    // dedupe first so sort sees the already-reduced set
    if (wantUniq) {
      lines = dedupeLines(lines);
    }

    if (wantSort) {
      const rawValue = extractOptionKeys(options, 'sortlines');
      const mode = resolveSortMode(rawValue);
      lines = sortLines(lines, mode);
    }

    const output = lines.join('\n');

    return [
      new BoxBuilder('Sort Lines', output)
        .setTemplate(CodeBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default SortLinesBoxSource;
