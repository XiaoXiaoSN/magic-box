import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { isString } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
// the DP is O(n*m); cap total input so the worst case (two ~500-char
// strings → 250k cells) stays well under a frame budget
const MAX_INPUT = 1_000;

// two-row DP: O(n*m) time, O(min(n,m)) space
function levenshtein(a: string, b: string): number {
  // ensure `a` is the shorter string so we allocate the smaller row
  if (a.length > b.length) {
    return levenshtein(b, a);
  }

  const m = a.length;
  const n = b.length;

  let prev = new Array<number>(m + 1);
  let curr = new Array<number>(m + 1);

  for (let i = 0; i <= m; i++) {
    prev[i] = i;
  }

  for (let j = 1; j <= n; j++) {
    curr[0] = j;
    for (let i = 1; i <= m; i++) {
      if (a.charCodeAt(i - 1) === b.charCodeAt(j - 1)) {
        curr[i] = prev[i - 1];
      } else {
        curr[i] =
          1 +
          Math.min(
            prev[i - 1], // substitution
            prev[i], // deletion
            curr[i - 1], // insertion
          );
      }
    }
    // swap rows without allocation
    const tmp = prev;
    prev = curr;
    curr = tmp;
  }

  return prev[m];
}

export const LevenshteinBoxSource = {
  name: 'Levenshtein',
  description:
    'Compute the Levenshtein edit distance between two newline-separated strings.',
  defaultInput: 'kitten\nsitting ::levenshtein',
  tag: '#',
  kind: 'Analyze',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'levenshtein', 'editdistance')) return [];
    if (!isString(input) || input.length > MAX_INPUT) return [];

    // split input into exactly two strings on the first newline
    const newlineIdx = input.indexOf('\n');
    if (newlineIdx === -1) {
      return [
        new BoxBuilder(
          'Levenshtein',
          'Two newline-separated strings are required (e.g. "abc\\nxyz ::levenshtein").',
        )
          .setTemplate(KeyValueBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const a = input.slice(0, newlineIdx);
    const b = input.slice(newlineIdx + 1);

    const distance = levenshtein(a, b);
    const maxLen = Math.max(a.length, b.length);
    // similarity is 1 when both strings are empty
    const similarity = maxLen === 0 ? 1 : 1 - distance / maxLen;
    const similarityPct = `${(similarity * 100).toFixed(1)}%`;

    const output: Record<string, string> = {
      Distance: String(distance),
      Similarity: similarityPct,
      'Length A': String(a.length),
      'Length B': String(b.length),
    };

    const plaintextOutput = Object.entries(output)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    return [
      new BoxBuilder('Levenshtein', plaintextOutput)
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(output)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default LevenshteinBoxSource;
