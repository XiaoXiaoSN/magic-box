import { isString } from '@functions/helper';
import { compareCodePoints } from '@functions/unicode';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const MAX_INPUT = 100_000;

// NaN-last numeric comparator with string fallback
function cmpNumeric(a: string, b: string): number {
  const na = parseFloat(a);
  const nb = parseFloat(b);
  const aIsNaN = Number.isNaN(na);
  const bIsNaN = Number.isNaN(nb);
  if (aIsNaN && bIsNaN) return compareCodePoints(a, b);
  if (aIsNaN) return 1;
  if (bIsNaN) return -1;
  if (na < nb) return -1;
  if (na > nb) return 1;
  return a === b ? 0 : compareCodePoints(a, b);
}

export const SortLinesBoxSource = {
  defaultDisabled: true,
  name: 'Sort Lines',
  description:
    'Sort the lines of text. ::sortlines (asc), modifiers ::desc, ::numeric, ::unique, ::ci (case-insensitive).',
  defaultInput: 'banana\napple\ncherry\n::sortlines',
  tag: '#',
  kind: 'Transform',

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'sortlines', 'sort')) return [];
    if (!isString(input) || input.length === 0 || input.length > MAX_INPUT)
      return [];

    const isNumeric = hasOptionKeys(options, 'numeric');
    const isCi = hasOptionKeys(options, 'ci', 'caseinsensitive');
    const isDesc = hasOptionKeys(options, 'desc', 'reverse');
    const isUnique = hasOptionKeys(options, 'unique', 'uniq');

    // normalize CRLF before splitting
    const lines = input.replace(/\r\n/g, '\n').split('\n');

    const compareLines = (a: string, b: string): number => {
      let cmp: number;
      if (isNumeric) {
        cmp = cmpNumeric(a, b);
      } else if (isCi) {
        cmp = compareCodePoints(a.toLowerCase(), b.toLowerCase());
      } else {
        cmp = compareCodePoints(a, b);
      }
      return isDesc ? -cmp : cmp;
    };

    const sorted = lines.slice().sort(compareLines);

    const deduped = isUnique
      ? sorted.filter(
          (line, index) =>
            index === 0 || compareLines(sorted[index - 1], line) !== 0,
        )
      : sorted;

    const output = deduped.join('\n');

    return [
      new BoxBuilder('Sort Lines', output)
        .setView('code')

        .build(),
    ];
  },
};

export default SortLinesBoxSource;
