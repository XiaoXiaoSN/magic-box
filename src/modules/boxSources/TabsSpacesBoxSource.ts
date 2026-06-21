import { CodeBoxTemplate } from '@components/BoxTemplate';
import { isString } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;
const DEFAULT_WIDTH = 4;

// clamp tab width to a sensible range
function resolveWidth(options: BoxOptions, ...keys: string[]): number {
  const raw = extractOptionKeys(options, ...keys);
  if (raw === null || raw === true) return DEFAULT_WIDTH;
  const n = Number.parseInt(String(raw), 10);
  if (Number.isNaN(n)) return DEFAULT_WIDTH;
  return Math.min(16, Math.max(1, n));
}

// replace leading tabs with spaces (width spaces per tab)
function tabsToSpaces(input: string, width: number): string {
  return input
    .split('\n')
    .map((line) => {
      let i = 0;
      while (i < line.length && line[i] === '\t') i++;
      if (i === 0) return line;
      return ' '.repeat(i * width) + line.slice(i);
    })
    .join('\n');
}

// replace groups of `width` leading spaces with tabs; leftover spaces stay
function spacesToTabs(input: string, width: number): string {
  return input
    .split('\n')
    .map((line) => {
      let i = 0;
      while (i < line.length && line[i] === ' ') i++;
      if (i === 0) return line;
      const tabs = Math.floor(i / width);
      const leftover = i % width;
      return '\t'.repeat(tabs) + ' '.repeat(leftover) + line.slice(i);
    })
    .join('\n');
}

export const TabsSpacesBoxSource = {
  name: 'Tabs / Spaces',
  description:
    'Convert leading tabs to spaces (::tabs2spaces=4) or leading spaces to tabs (::spaces2tabs=4).',
  defaultInput: '\tindented ::tabs2spaces',
  tag: '#',
  kind: 'Transform',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const wantToSpaces = hasOptionKeys(options, 'tabs2spaces', 'untabify');
    const wantToTabs = hasOptionKeys(options, 'spaces2tabs', 'tabify');
    if (!wantToSpaces && !wantToTabs) return [];
    if (!isString(input) || input.length === 0 || input.length > MAX_INPUT)
      return [];

    let output: string;
    if (wantToSpaces) {
      output = tabsToSpaces(
        input,
        resolveWidth(options, 'tabs2spaces', 'untabify'),
      );
    } else {
      output = spacesToTabs(
        input,
        resolveWidth(options, 'spaces2tabs', 'tabify'),
      );
    }

    return [
      new BoxBuilder('Tabs / Spaces', output)
        .setTemplate(CodeBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default TabsSpacesBoxSource;
