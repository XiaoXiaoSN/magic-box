import { CodeBoxTemplate } from '@components/BoxTemplate';
import { isString } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// strip trailing \r from each line to tolerate CRLF input
function splitLines(input: string): string[] {
  return input.split('\n').map((line) => line.replace(/\r$/, ''));
}

export const LineToolsBoxSource = {
  name: 'Line Tools',
  description: 'Sort, de-duplicate, or reverse the lines of a text block.',
  defaultInput: 'banana\napple\ncherry\napple ::sortlines',
  tag: '#',
  kind: 'Transform',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const wantSort = hasOptionKeys(options, 'sortlines');
    const wantUnique = hasOptionKeys(options, 'uniquelines');
    const wantReverse = hasOptionKeys(options, 'reverselines');

    if (!wantSort && !wantUnique && !wantReverse) return [];
    if (!isString(input) || input.length === 0 || input.length > MAX_INPUT)
      return [];

    const lines = splitLines(input);
    const boxes: Box[] = [];

    if (wantSort) {
      const sorted = [...lines].sort((a, b) => a.localeCompare(b));
      boxes.push(
        new BoxBuilder('Sorted Lines', sorted.join('\n'))
          .setTemplate(CodeBoxTemplate)
          .setPriority(this.priority)
          .build(),
      );
    }

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
          .setTemplate(CodeBoxTemplate)
          .setPriority(this.priority)
          .build(),
      );
    }

    if (wantReverse) {
      const reversed = [...lines].reverse();
      boxes.push(
        new BoxBuilder('Reversed Lines', reversed.join('\n'))
          .setTemplate(CodeBoxTemplate)
          .setPriority(this.priority)
          .build(),
      );
    }

    return boxes;
  },
};

export default LineToolsBoxSource;
