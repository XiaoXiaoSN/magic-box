import { CodeBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// recursively sort object keys; arrays preserve element order but recurse into elements
function sortKeys(value: unknown, descending: boolean): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortKeys(item, descending));
  }

  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    const sorted = entries.sort(([a], [b]) =>
      descending ? (b < a ? -1 : b > a ? 1 : 0) : a < b ? -1 : a > b ? 1 : 0,
    );
    // Object.fromEntries assigns '__proto__' as a plain own data property, not prototype mutation
    return Object.fromEntries(
      sorted.map(([k, v]) => [k, sortKeys(v, descending)]),
    );
  }

  return value;
}

export const JsonSortKeysBoxSource = {
  defaultDisabled: true,
  name: 'JSON Sort Keys',
  description:
    'Recursively sort the keys of a JSON object (canonical form). Use ::jsonsort=desc for descending.',
  defaultInput: '{"b":1,"a":{"d":4,"c":3}} ::jsonsort',
  tag: '#',
  kind: 'Transform',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'jsonsort', 'sortkeys')) return [];
    if (input.length > MAX_INPUT) return [];

    const descending =
      extractOptionKeys(options, 'jsonsort', 'sortkeys') === 'desc';

    let parsed: unknown;
    try {
      parsed = JSON.parse(trim(input));
    } catch {
      return [
        new BoxBuilder('JSON Sort Keys', 'Invalid JSON: unable to parse input')
          .setOptions({ language: 'json' })
          .setTemplate(CodeBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const sorted = sortKeys(parsed, descending);
    const output = JSON.stringify(sorted, null, 2);

    return [
      new BoxBuilder('JSON Sort Keys', output)
        .setOptions({ language: 'json' })
        .setTemplate(CodeBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default JsonSortKeysBoxSource;
