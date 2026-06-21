import { CodeBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// recursively flatten a nested value into dot/bracket path → leaf entries
function flattenValue(
  value: unknown,
  prefix: string,
  result: Record<string, unknown>,
): void {
  if (value === null || typeof value !== 'object') {
    result[prefix] = value;
    return;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      result[prefix] = [];
      return;
    }
    for (let i = 0; i < value.length; i++) {
      flattenValue(value[i], `${prefix}[${i}]`, result);
    }
    return;
  }

  const keys = Object.keys(value as Record<string, unknown>);
  if (keys.length === 0) {
    result[prefix] = {};
    return;
  }
  for (const key of keys) {
    const nextPrefix = prefix === '' ? key : `${prefix}.${key}`;
    flattenValue((value as Record<string, unknown>)[key], nextPrefix, result);
  }
}

function flatten(input: unknown): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (input === null || typeof input !== 'object') {
    return result;
  }
  if (Array.isArray(input)) {
    for (let i = 0; i < input.length; i++) {
      flattenValue(input[i], `[${i}]`, result);
    }
    return result;
  }
  for (const key of Object.keys(input as Record<string, unknown>)) {
    flattenValue((input as Record<string, unknown>)[key], key, result);
  }
  return result;
}

// split a flat key like "a.b[0].c[1]" into segments ["a", "b", 0, "c", 1]
function splitKey(key: string): (string | number)[] {
  const segments: (string | number)[] = [];
  // tokenize by '.' and '[n]'
  const parts = key.split('.');
  for (const part of parts) {
    // a part may look like "arr[0][1]" after splitting on '.'
    const re = /([^[]*)((?:\[\d+\])*)/g;
    const m = re.exec(part);
    if (m) {
      if (m[1] !== '') segments.push(m[1]);
      const brackets = m[2];
      if (brackets) {
        for (const idx of brackets.matchAll(/\[(\d+)\]/g)) {
          segments.push(Number.parseInt(idx[1], 10));
        }
      }
    }
  }
  return segments;
}

// keys that would walk into the prototype chain and let a crafted ?input=
// pollute Object.prototype for the whole session
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

// set a value at a nested path described by segments, creating objects/arrays as needed
function setPath(
  root: Record<string, unknown> | unknown[],
  segments: (string | number)[],
  value: unknown,
): void {
  // refuse any path that touches a prototype-chain key
  if (segments.some((s) => typeof s === 'string' && FORBIDDEN_KEYS.has(s))) {
    return;
  }

  let current: Record<string, unknown> | unknown[] = root;
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i];
    const nextSeg = segments[i + 1];
    const nextIsIndex = typeof nextSeg === 'number';

    if (typeof seg === 'number') {
      const arr = current as unknown[];
      if (arr[seg] == null) {
        arr[seg] = nextIsIndex ? [] : {};
      }
      current = arr[seg] as Record<string, unknown> | unknown[];
    } else {
      const obj = current as Record<string, unknown>;
      if (obj[seg] == null) {
        obj[seg] = nextIsIndex ? [] : {};
      }
      current = obj[seg] as Record<string, unknown> | unknown[];
    }
  }

  const last = segments[segments.length - 1];
  if (typeof last === 'number') {
    (current as unknown[])[last] = value;
  } else {
    (current as Record<string, unknown>)[last] = value;
  }
}

function unflatten(flat: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(flat)) {
    const segments = splitKey(key);
    if (segments.length === 0) continue;
    setPath(result, segments, value);
  }
  return result;
}

export const JsonFlattenBoxSource = {
  name: 'JSON Flatten',
  description:
    'Flatten nested JSON to dot-notation keys, or unflatten dot keys back to nested JSON.',
  defaultInput: '{"a":{"b":1,"c":[2,3]}} ::flatten',
  tag: '#',
  kind: 'Transform',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const wantFlatten = hasOptionKeys(options, 'flatten', 'jsonflatten');
    const wantUnflatten = hasOptionKeys(options, 'unflatten', 'jsonunflatten');
    if (!wantFlatten && !wantUnflatten) return [];
    if (input.length > MAX_INPUT) return [];

    const trimmed = trim(input);

    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      const errorBox = new BoxBuilder(
        'JSON Flatten',
        `Invalid JSON: unable to parse input.\n\n${trimmed.slice(0, 200)}`,
      )
        .setTemplate(CodeBoxTemplate)
        .setPriority(Priority)
        .build();
      return [errorBox];
    }

    let output: string;
    if (wantFlatten) {
      output = JSON.stringify(flatten(parsed), null, 2);
    } else {
      // wantUnflatten — parsed must be a flat object
      const flat = parsed as Record<string, unknown>;
      output = JSON.stringify(unflatten(flat), null, 2);
    }

    const box = new BoxBuilder('JSON Flatten', output)
      .setOptions({ language: 'json' })
      .setTemplate(CodeBoxTemplate)
      .setPriority(Priority)
      .build();

    return [box];
  },
};

export default JsonFlattenBoxSource;
