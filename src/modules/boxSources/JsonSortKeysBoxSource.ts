import { CodeBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// recursively sorts object keys alphabetically; arrays preserve element order
function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value !== null && typeof value === 'object') {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = sortKeys((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return value;
}

export const JsonSortKeysBoxSource = {
  name: 'JSON Sort Keys',
  description:
    'Recursively sort the keys of a JSON object and pretty-print it.',
  defaultInput: '{"b":1,"a":{"d":4,"c":3}} ::sortkeys',
  tag: '#',
  kind: 'Transform',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'sortkeys')) return [];
    if (input.length > MAX_INPUT) return [];

    const trimmed = trim(input);
    // no box for empty input — avoids a spurious error while the user types
    if (trimmed.length === 0) return [];
    let output: string;
    try {
      const parsed = JSON.parse(trimmed);
      output = JSON.stringify(sortKeys(parsed), null, 2);
    } catch {
      output = 'Invalid JSON: unable to parse input.';
      return [
        new BoxBuilder('JSON Sort Keys', output)
          .setTemplate(CodeBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }

    return [
      new BoxBuilder('JSON Sort Keys', output)
        .setTemplate(CodeBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default JsonSortKeysBoxSource;
