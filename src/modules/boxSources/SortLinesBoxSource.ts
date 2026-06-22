import { CodeBoxTemplate } from '@components/BoxTemplate';
import { isString } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// stable code-point comparison — avoids locale-dependent collation
function cmpString(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

// NaN-last numeric comparator with string fallback
function cmpNumeric(a: string, b: string): number {
  const na = parseFloat(a);
  const nb = parseFloat(b);
  const aIsNaN = Number.isNaN(na);
  const bIsNaN = Number.isNaN(nb);
  if (aIsNaN && bIsNaN) return cmpString(a, b);
  if (aIsNaN) return 1;
  if (bIsNaN) return -1;
  return na < nb ? -1 : na > nb ? 1 : 0;
}

export const SortLinesBoxSource = {
  name: 'Sort Lines',
  description:
    'Sort the lines of text. ::sortlines (asc), modifiers ::desc, ::numeric, ::unique, ::ci (case-insensitive).',
  defaultInput: 'banana\napple\ncherry ::sortlines',
  tag: '#',
  kind: 'Transform',
  priority: Priority,

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

    const sorted = lines.slice().sort((a, b) => {
      let cmp: number;
      if (isNumeric) {
        cmp = cmpNumeric(a, b);
      } else if (isCi) {
        cmp = cmpString(a.toLowerCase(), b.toLowerCase());
      } else {
        cmp = cmpString(a, b);
      }
      return isDesc ? -cmp : cmp;
    });

    const deduped = isUnique
      ? sorted.filter((line, idx, arr) => arr.indexOf(line) === idx)
      : sorted;

    const output = deduped.join('\n');

    return [
      new BoxBuilder('Sort Lines', output)
        .setTemplate(CodeBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default SortLinesBoxSource;
