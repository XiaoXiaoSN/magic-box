import { CodeBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// unescape a single RFC 6901 reference token: ~1 → / then ~0 → ~
function unescapeToken(token: string): string {
  return token.replace(/~1/g, '/').replace(/~0/g, '~');
}

// evaluate an RFC 6901 JSON Pointer against a parsed document.
// returns the resolved value or throws with a descriptive message.
function evaluatePointer(doc: unknown, pointer: string): unknown {
  if (pointer === '') {
    return doc;
  }

  if (!pointer.startsWith('/')) {
    throw new Error(`Invalid pointer: must be empty or start with '/'`);
  }

  const tokens = pointer.slice(1).split('/').map(unescapeToken);
  let current: unknown = doc;

  for (const token of tokens) {
    if (Array.isArray(current)) {
      if (token === '-') {
        throw new Error(
          `Pointer token '-' refers to a non-existent array element`,
        );
      }
      if (!/^(0|[1-9]\d*)$/.test(token)) {
        // RFC 6901 §4: array index is "0" or a digit1-9 run (no leading zeros)
        throw new Error(`Pointer token '${token}' is not a valid array index`);
      }
      const index = Number(token);
      if (index >= current.length) {
        throw new Error(
          `Pointer did not resolve: index ${index} out of bounds (length ${current.length})`,
        );
      }
      current = current[index];
    } else if (current !== null && typeof current === 'object') {
      // only allow own-property access — never prototype traversal
      if (!Object.hasOwn(current as Record<string, unknown>, token)) {
        throw new Error(`Pointer did not resolve: key '${token}' not found`);
      }
      current = (current as Record<string, unknown>)[token];
    } else {
      throw new Error(
        `Pointer did not resolve: cannot index into ${JSON.stringify(current)} with '${token}'`,
      );
    }
  }

  return current;
}

function makeErrorBox(message: string, priority: number): Box {
  return new BoxBuilder('JSON Pointer', message)
    .setOptions({ language: 'text' })
    .setTemplate(CodeBoxTemplate)
    .setPriority(priority)
    .build();
}

export const JsonPointerBoxSource = {
  name: 'JSON Pointer',
  description:
    'Evaluate an RFC 6901 JSON Pointer against a JSON document. ::jsonpointer=/path/to/value',
  defaultInput: '{"a":{"b":[1,2,3]}} ::jsonpointer=/a/b/1',
  tag: '#',
  kind: 'Extract',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const pointer = extractOptionKeys(options, 'jsonpointer', 'jsonptr');

    // option absent entirely — not our job
    if (pointer === null) return [];

    // bare flag (e.g. ::jsonpointer without a value) — show usage hint
    if (typeof pointer !== 'string') {
      return [
        makeErrorBox(
          'Usage: ::jsonpointer=/path/to/value\nExample: {"a":{"b":[1,2,3]}} ::jsonpointer=/a/b/1',
          this.priority,
        ),
      ];
    }

    if (input.length > MAX_INPUT) return [];

    const trimmed = trim(input);

    let doc: unknown;
    try {
      doc = JSON.parse(trimmed);
    } catch {
      return [
        makeErrorBox(`Invalid JSON: ${trimmed.slice(0, 120)}`, this.priority),
      ];
    }

    let resolved: unknown;
    try {
      resolved = evaluatePointer(doc, pointer);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return [makeErrorBox(msg, this.priority)];
    }

    const output = JSON.stringify(resolved, null, 2);
    return [
      new BoxBuilder('JSON Pointer', output)
        .setOptions({ language: 'json' })
        .setTemplate(CodeBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default JsonPointerBoxSource;
