import { CodeBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// tokenize a dot/bracket path string into an array of string keys or numeric indices
function parsePath(path: string): Array<string | number> {
  const segments: Array<string | number> = [];
  // matches either a bare key (dot-separated) or a bracket expression [key] or [index]
  const re = /(?:^|\.)([^.[]+)|\[([^\]]*)\]/g;
  let match: RegExpExecArray | null;
  // biome-ignore lint/suspicious/noAssignInExpressions: idiomatic regex loop
  while ((match = re.exec(path)) !== null) {
    if (match[1] !== undefined) {
      // dot-separated segment: treat as numeric if it looks like one
      const parsed = Number.parseInt(match[1], 10);
      segments.push(Number.isNaN(parsed) ? match[1] : parsed);
    } else if (match[2] !== undefined) {
      // bracket segment: strip surrounding quotes if present, else parse as integer
      const inner = match[2].replace(/^['"]|['"]$/g, '');
      const parsed = Number.parseInt(inner, 10);
      segments.push(Number.isNaN(parsed) ? inner : parsed);
    }
  }
  return segments;
}

// walk the parsed JSON value along the given path segments
function walkPath(
  value: unknown,
  segments: Array<string | number>,
): { found: true; value: unknown } | { found: false } {
  let current: unknown = value;
  for (const seg of segments) {
    if (current === null || typeof current !== 'object') {
      return { found: false };
    }
    const obj = current as Record<string | number, unknown>;
    if (!(seg in obj)) {
      return { found: false };
    }
    current = obj[seg];
  }
  return { found: true, value: current };
}

export const JsonPathBoxSource = {
  name: 'JSON Path',
  description:
    'Extract a value from JSON with a dot/bracket path. e.g. ::jsonpath=a.b[0].c',
  defaultInput: '{"a":{"b":[10,20,30]}} ::jsonpath=a.b[1]',
  tag: '#',
  kind: 'Analyze',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'jsonpath', 'jpath')) return [];
    if (input.length > MAX_INPUT) return [];

    const pathValue = extractOptionKeys(options, 'jsonpath', 'jpath');

    // no path provided (bare ::jsonpath flag with no value)
    if (typeof pathValue !== 'string' || pathValue === '') {
      return [
        new BoxBuilder(
          'JSON Path',
          'A path is required. Usage: ::jsonpath=a.b[0].c',
        )
          .setTemplate(CodeBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(trim(input));
    } catch {
      return [
        new BoxBuilder('JSON Path', 'Invalid JSON: could not parse the input.')
          .setTemplate(CodeBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const segments = parsePath(pathValue);
    const result = walkPath(parsed, segments);

    if (!result.found) {
      return [
        new BoxBuilder(
          'JSON Path',
          `Path not found: "${pathValue}" does not exist in the provided JSON.`,
        )
          .setTemplate(CodeBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const output = JSON.stringify(result.value, null, 2);
    return [
      new BoxBuilder('JSON Path', output)
        .setTemplate(CodeBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default JsonPathBoxSource;
