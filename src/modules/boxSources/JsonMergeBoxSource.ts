import { CodeBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// keys that must never be assigned during merge to prevent prototype pollution
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

/** recursively merge `target` with `source`; source wins on conflict. arrays are replaced, not concatenated. */
function deepMerge(
  target: { [key: string]: JsonValue },
  source: { [key: string]: JsonValue },
): { [key: string]: JsonValue } {
  const result: { [key: string]: JsonValue } = { ...target };

  for (const key of Object.keys(source)) {
    if (FORBIDDEN_KEYS.has(key)) continue;

    const srcVal = source[key];
    const tgtVal = result[key];

    if (
      srcVal !== null &&
      typeof srcVal === 'object' &&
      !Array.isArray(srcVal) &&
      tgtVal !== null &&
      typeof tgtVal === 'object' &&
      !Array.isArray(tgtVal)
    ) {
      result[key] = deepMerge(
        tgtVal as { [key: string]: JsonValue },
        srcVal as { [key: string]: JsonValue },
      );
    } else {
      result[key] = srcVal;
    }
  }

  return result;
}

export const JsonMergeBoxSource = {
  name: 'JSON Merge',
  description:
    'Deep-merge two JSON documents (the second overrides the first). Separate them with a line containing only ---.',
  defaultInput: '{"a":1,"b":{"x":1}}\n---\n{"b":{"y":2},"c":3} ::jsonmerge',
  tag: '{}+',
  kind: 'Transform',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'jsonmerge', 'merge')) return [];
    if (input.length > MAX_INPUT) return [];

    const trimmed = trim(input);

    // split on a line that is exactly '---'
    const parts = trimmed.split(/^---$/m);

    if (parts.length !== 2) {
      return [
        new BoxBuilder(
          'JSON Merge',
          'Provide two JSON documents separated by a line containing only ---.',
        )
          .setPriority(this.priority)
          .build(),
      ];
    }

    const [rawFirst, rawSecond] = parts;

    let first: { [key: string]: JsonValue };
    try {
      const parsed = JSON.parse(trim(rawFirst));
      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        throw new SyntaxError('not a JSON object');
      }
      first = parsed as { [key: string]: JsonValue };
    } catch {
      return [
        new BoxBuilder(
          'JSON Merge',
          'The first document is not valid JSON. Check its syntax and try again.',
        )
          .setPriority(this.priority)
          .build(),
      ];
    }

    let second: { [key: string]: JsonValue };
    try {
      const parsed = JSON.parse(trim(rawSecond));
      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        throw new SyntaxError('not a JSON object');
      }
      second = parsed as { [key: string]: JsonValue };
    } catch {
      return [
        new BoxBuilder(
          'JSON Merge',
          'The second document is not valid JSON. Check its syntax and try again.',
        )
          .setPriority(this.priority)
          .build(),
      ];
    }

    const merged = deepMerge(first, second);
    const output = JSON.stringify(merged, null, 2);

    return [
      new BoxBuilder('JSON Merge', output)
        .setOptions({ language: 'json' })
        .setTemplate(CodeBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default JsonMergeBoxSource;
