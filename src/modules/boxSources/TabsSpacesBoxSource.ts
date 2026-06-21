import { CodeBoxTemplate } from '@components/BoxTemplate';
import { isString } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;
const DEFAULT_WIDTH = 4;
const MIN_WIDTH = 1;
const MAX_WIDTH = 16;

// clamps the parsed tab/space width to a valid range
function parseWidth(raw: string | boolean | null): number {
  if (raw === null || raw === true || raw === false) return DEFAULT_WIDTH;
  const n = Number.parseInt(String(raw), 10);
  if (Number.isNaN(n)) return DEFAULT_WIDTH;
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, n));
}

// replaces each leading tab with N spaces; mid-line tabs are untouched
function tabsToSpaces(input: string, width: number): string {
  const spaces = ' '.repeat(width);
  return input
    .split('\n')
    .map((line) => {
      let i = 0;
      while (i < line.length && line[i] === '\t') i++;
      return spaces.repeat(i) + line.slice(i);
    })
    .join('\n');
}

// replaces each group of N leading spaces with one tab; mid-line spaces are untouched
function spacesToTabs(input: string, width: number): string {
  return input
    .split('\n')
    .map((line) => {
      let i = 0;
      while (i < line.length && line[i] === ' ') i++;
      const tabs = Math.floor(i / width);
      const remainder = i % width;
      return '\t'.repeat(tabs) + ' '.repeat(remainder) + line.slice(i);
    })
    .join('\n');
}

export const TabsSpacesBoxSource = {
  name: 'Tabs / Spaces',
  description:
    'Convert leading-indentation tabs to spaces (::spaces=N) or spaces to tabs (::tabs=N).',
  defaultInput: '\thello\n\t\tworld ::spaces=2',
  tag: '#',
  kind: 'Transform',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const toSpaces = hasOptionKeys(options, 'spaces', 'untabify');
    const toTabs = hasOptionKeys(options, 'tabs', 'tabify');

    if (!toSpaces && !toTabs) return [];
    if (!isString(input) || input.length === 0 || input.length > MAX_INPUT)
      return [];

    const boxes: Box[] = [];

    if (toSpaces) {
      const width = parseWidth(
        extractOptionKeys(options, 'spaces', 'untabify'),
      );
      const output = tabsToSpaces(input, width);
      boxes.push(
        new BoxBuilder('Tabs → Spaces', output)
          .setTemplate(CodeBoxTemplate)
          .setOptions(options)
          .setPriority(this.priority)
          .build(),
      );
    }

    if (toTabs) {
      const width = parseWidth(extractOptionKeys(options, 'tabs', 'tabify'));
      const output = spacesToTabs(input, width);
      boxes.push(
        new BoxBuilder('Spaces → Tabs', output)
          .setTemplate(CodeBoxTemplate)
          .setOptions(options)
          .setPriority(this.priority)
          .build(),
      );
    }

    return boxes;
  },
};

export default TabsSpacesBoxSource;
