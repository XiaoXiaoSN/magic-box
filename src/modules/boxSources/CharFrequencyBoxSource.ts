import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { isString, trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;
// maximum rows shown to bound output size
const MAX_DISPLAY_ROWS = 100;

// visible token labels for whitespace/control characters
function charToken(char: string): string {
  if (char === ' ') return 'SPACE';
  if (char === '\t') return 'TAB';
  if (char === '\n') return 'LF';
  if (char === '\r') return 'CR';
  return char;
}

export const CharFrequencyBoxSource = {
  name: 'Character Frequency',
  description: 'Count how often each character appears in the text.',
  defaultInput: 'hello world ::charfreq',
  tag: '#',
  kind: 'Calculate',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'charfreq', 'charfrequency')) return [];
    if (
      !isString(input) ||
      trim(input).length === 0 ||
      input.length > MAX_INPUT
    )
      return [];

    // build frequency map keyed by code point to avoid prototype pollution;
    // for..of iterates by Unicode code point, so surrogate pairs count as 1
    const freq = new Map<string, number>();
    let totalChars = 0;
    for (const char of input) {
      freq.set(char, (freq.get(char) ?? 0) + 1);
      totalChars++;
    }

    const uniqueChars = freq.size;

    // sort by count desc, then by code point asc for ties
    const sorted = [...freq.entries()].sort(
      ([charA, countA], [charB, countB]) => {
        if (countB !== countA) return countB - countA;
        const cpA = charA.codePointAt(0) ?? 0;
        const cpB = charB.codePointAt(0) ?? 0;
        return cpA - cpB;
      },
    );

    const truncated = sorted.length > MAX_DISPLAY_ROWS;
    const displayed = truncated ? sorted.slice(0, MAX_DISPLAY_ROWS) : sorted;

    // summary entries come first; character entries follow
    const kvOptions: Record<string, string> = {
      'Total Characters': String(totalChars),
      'Unique Characters': String(uniqueChars),
    };
    for (const [char, count] of displayed) {
      kvOptions[charToken(char)] = String(count);
    }
    if (truncated) {
      kvOptions['(truncated)'] =
        `showing top ${MAX_DISPLAY_ROWS} of ${sorted.length} unique chars`;
    }

    // build plaintext as a readable key:value list for headless / TUI use
    const plaintextLines = Object.entries(kvOptions).map(
      ([k, v]) => `${k}: ${v}`,
    );
    const plaintextOutput = plaintextLines.join('\n');

    return [
      new BoxBuilder('Character Frequency', plaintextOutput)
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(kvOptions)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default CharFrequencyBoxSource;
