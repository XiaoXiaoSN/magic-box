import { CodeBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// prototype-dangerous keys that must never be traversed
const PROTO_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

type PathSegment =
  | { type: 'key'; key: string }
  | { type: 'index'; index: number };

// tokenize a jsonpath expression into typed segments.
// strips an optional leading `$` and leading `.`, then splits on `.` and `[…]`.
function parsePath(raw: string): PathSegment[] | null {
  // strip leading `$` and any leading dot
  let path = raw.trim();
  if (path.startsWith('$')) {
    path = path.slice(1);
  }
  if (path.startsWith('.')) {
    path = path.slice(1);
  }

  if (path === '') {
    return [];
  }

  const segments: PathSegment[] = [];
  // tokenize using a regex that matches:
  //   [n]         — numeric index
  //   ["key"]     — double-quoted bracket key
  //   ['key']     — single-quoted bracket key
  //   identifier  — dot-separated key (may be preceded by a dot consumed above)
  const tokenRe = /\[(\d+)\]|\["([^"]*)"\]|\['([^']*)'\]|([^.[]+)/g;
  let match: RegExpExecArray | null;
  // biome-ignore lint/suspicious/noAssignInExpressions: idiomatic regex loop
  while ((match = tokenRe.exec(path)) !== null) {
    if (match[1] !== undefined) {
      // [n] — numeric index
      segments.push({ type: 'index', index: Number.parseInt(match[1], 10) });
    } else if (match[2] !== undefined) {
      // ["key"]
      segments.push({ type: 'key', key: match[2] });
    } else if (match[3] !== undefined) {
      // ['key']
      segments.push({ type: 'key', key: match[3] });
    } else if (match[4] !== undefined) {
      // dot-separated key
      segments.push({ type: 'key', key: match[4] });
    } else {
      return null;
    }
  }

  return segments;
}

function buildBox(name: string, output: string, priority: number): Box {
  return new BoxBuilder(name, output)
    .setTemplate(CodeBoxTemplate)
    .setOptions({ language: 'json' })
    .setPriority(priority)
    .build();
}

export const JsonPathBoxSource = {
  defaultDisabled: true,
  name: 'JSON Path',
  description:
    'Extract a value from JSON with a dot/bracket path. e.g. ::jsonpath=$.a.b[0] or ::jsonpath=a.b[0].',
  defaultInput: '{"a":{"b":[10,20]}} ::jsonpath=$.a.b[1]',
  tag: '#',
  kind: 'Analyze',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'jsonpath', 'jpath')) return [];
    if (input.length > MAX_INPUT) return [];

    const rawPath = extractOptionKeys(options, 'jsonpath', 'jpath');

    // bare `::jsonpath` without a string value — narrows rawPath to string below
    if (typeof rawPath !== 'string' || rawPath === '') {
      return [
        buildBox(
          'JSON Path',
          'A path is required. Example: ::jsonpath=$.a.b[0]',
          this.priority,
        ),
      ];
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(trim(input));
    } catch {
      return [
        buildBox(
          'JSON Path',
          'Invalid JSON: could not parse input.',
          this.priority,
        ),
      ];
    }

    const segments = parsePath(rawPath);
    if (segments === null) {
      return [buildBox('JSON Path', `Invalid path: ${rawPath}`, this.priority)];
    }

    // root value with empty path
    if (segments.length === 0) {
      const out =
        typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2);
      return [buildBox('JSON Path', out, this.priority)];
    }

    let current: unknown = parsed;
    for (const seg of segments) {
      if (seg.type === 'key') {
        // block prototype-dangerous keys
        if (PROTO_KEYS.has(seg.key)) {
          return [
            buildBox(
              'JSON Path',
              `Path not found: "${seg.key}" is a reserved key.`,
              this.priority,
            ),
          ];
        }
        if (
          current === null ||
          typeof current !== 'object' ||
          Array.isArray(current)
        ) {
          return [
            buildBox(
              'JSON Path',
              `Path not found at segment "${seg.key}".`,
              this.priority,
            ),
          ];
        }
        if (!Object.hasOwn(current as Record<string, unknown>, seg.key)) {
          return [
            buildBox(
              'JSON Path',
              `Path not found: key "${seg.key}" does not exist.`,
              this.priority,
            ),
          ];
        }
        current = (current as Record<string, unknown>)[seg.key];
      } else {
        // numeric index
        if (!Array.isArray(current)) {
          return [
            buildBox(
              'JSON Path',
              `Path not found: expected an array at index ${seg.index}.`,
              this.priority,
            ),
          ];
        }
        if (seg.index < 0 || seg.index >= (current as unknown[]).length) {
          return [
            buildBox(
              'JSON Path',
              `Path not found: index ${seg.index} out of bounds.`,
              this.priority,
            ),
          ];
        }
        current = (current as unknown[])[seg.index];
      }
    }

    const output =
      typeof current === 'string' ? current : JSON.stringify(current, null, 2);

    return [buildBox('JSON Path', output, this.priority)];
  },
};

export default JsonPathBoxSource;
