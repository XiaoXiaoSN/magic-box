import { CodeBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// converts a JSON array to JSONL (one compact JSON element per line)
function arrayToJsonl(arr: unknown[]): string {
  return arr.map((item) => JSON.stringify(item)).join('\n');
}

// converts JSONL lines to a pretty-printed JSON array; throws on invalid lines
function jsonlToArray(input: string): unknown[] {
  const lines = input
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return lines.map((line, idx) => {
    try {
      return JSON.parse(line);
    } catch {
      throw new Error(`line ${idx + 1}: ${JSON.stringify(line)}`);
    }
  });
}

export const JsonlBoxSource = {
  name: 'JSONL',
  description:
    'Convert a JSON array to JSONL (one object per line) or JSONL back to a JSON array. ::jsonl',
  defaultInput: '[{"a":1},{"a":2}] ::jsonl',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'jsonl', 'ndjson')) return [];
    if (input.length > MAX_INPUT) return [];

    const trimmed = trim(input);

    // array → jsonl direction
    if (trimmed.startsWith('[')) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        return [
          new BoxBuilder('JSONL', `Parse error: invalid JSON array`)
            .setTemplate(CodeBoxTemplate)
            .setOptions({ language: 'json' })
            .setPriority(this.priority)
            .build(),
        ];
      }

      if (!Array.isArray(parsed)) {
        return [
          new BoxBuilder('JSONL', 'Parse error: input is not a JSON array')
            .setTemplate(CodeBoxTemplate)
            .setOptions({ language: 'json' })
            .setPriority(this.priority)
            .build(),
        ];
      }

      const output = arrayToJsonl(parsed);
      return [
        new BoxBuilder('JSONL', output)
          .setTemplate(CodeBoxTemplate)
          .setOptions({ language: 'json' })
          .setPriority(this.priority)
          .build(),
      ];
    }

    // jsonl → array direction
    let arr: unknown[];
    try {
      arr = jsonlToArray(trimmed);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return [
        new BoxBuilder('JSONL', `Parse error: ${msg}`)
          .setTemplate(CodeBoxTemplate)
          .setOptions({ language: 'json' })
          .setPriority(this.priority)
          .build(),
      ];
    }

    const output = JSON.stringify(arr, null, 2);
    return [
      new BoxBuilder('JSONL', output)
        .setTemplate(CodeBoxTemplate)
        .setOptions({ language: 'json' })
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default JsonlBoxSource;
