import { isString } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, errorBox, hasOptionKeys } from '@modules/Box';

const MAX_INPUT = 100_000;

// split into lines, stripping trailing \r (CRLF) and dropping the single empty
// element a trailing newline would otherwise produce
function splitLines(input: string): string[] {
  const lines = input.split('\n').map((line) => line.replace(/\r$/, ''));
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  return lines;
}

export const LineToolsBoxSource = {
  defaultDisabled: true,
  name: 'Line Tools',
  description: 'De-duplicate or reverse the lines of a text block.',
  defaultInput: 'banana\napple\ncherry\napple\n::uniquelines',
  tag: '#',
  kind: 'Transform',

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const wantUnique = hasOptionKeys(options, 'uniquelines');
    const wantReverse = hasOptionKeys(options, 'reverselines');

    if (!wantUnique && !wantReverse) return [];
    if (!isString(input) || input.length === 0) return [];
    if (input.length > MAX_INPUT) {
      return [
        errorBox(
          'Line Tools',
          `Input is too large (${input.length} characters, limit ${MAX_INPUT}).`,
        ),
      ];
    }

    const lines = splitLines(input);
    const boxes: Box[] = [];

    if (wantUnique) {
      // keep first occurrence order
      const seen = new Set<string>();
      const unique = lines.filter((line) => {
        if (seen.has(line)) return false;
        seen.add(line);
        return true;
      });
      boxes.push(
        new BoxBuilder('Unique Lines', unique.join('\n'))
          .setView('code')

          .build(),
      );
    }

    if (wantReverse) {
      const reversed = [...lines].reverse();
      boxes.push(
        new BoxBuilder('Reversed Lines', reversed.join('\n'))
          .setView('code')

          .build(),
      );
    }

    return boxes;
  },
};

export default LineToolsBoxSource;
