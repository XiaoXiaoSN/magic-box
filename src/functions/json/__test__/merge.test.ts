import { describe, expect, it } from 'vitest';

import { deepMerge, mergeDocuments } from '../merge';
import { JsonToolError } from '../shared';

const merged = (input: string): string => JSON.stringify(mergeDocuments(input));

describe('deepMerge', () => {
  it('merges nested objects with the later object winning', () => {
    expect(
      JSON.stringify(deepMerge({ a: 1, b: { x: 1, y: 1 } }, { b: { y: 2 } })),
    ).toBe('{"a":1,"b":{"x":1,"y":2}}');
  });

  it('replaces arrays instead of concatenating', () => {
    expect(JSON.stringify(deepMerge({ a: [1, 2] }, { a: [3] }))).toBe(
      '{"a":[3]}',
    );
  });

  it('keeps null as a value (not RFC 7396 deletion)', () => {
    expect(JSON.stringify(deepMerge({ a: 1 }, { a: null }))).toBe('{"a":null}');
  });

  it('lets an object replace a scalar and vice versa', () => {
    expect(JSON.stringify(deepMerge({ a: 1 }, { a: { b: 2 } }))).toBe(
      '{"a":{"b":2}}',
    );
    expect(JSON.stringify(deepMerge({ a: { b: 2 } }, { a: 1 }))).toBe(
      '{"a":1}',
    );
  });

  it('does not mutate its inputs', () => {
    const base = { a: { x: 1 } };
    const override = { a: { y: 2 } };
    deepMerge(base, override);
    expect(base).toEqual({ a: { x: 1 } });
    expect(override).toEqual({ a: { y: 2 } });
  });
});

describe('mergeDocuments', () => {
  it('merges two --- separated documents', () => {
    expect(merged('{"a":1,"b":{"x":1}}\n---\n{"b":{"y":2},"c":3}')).toBe(
      '{"a":1,"b":{"x":1,"y":2},"c":3}',
    );
  });

  it('folds more than two documents left to right', () => {
    expect(merged('{"a":1}\n---\n{"a":2,"b":1}\n---\n{"b":2}')).toBe(
      '{"a":2,"b":2}',
    );
  });

  it('accepts CRLF line endings and trailing spaces on the separator', () => {
    expect(merged('{"a":1}\r\n--- \r\n{"b":2}')).toBe('{"a":1,"b":2}');
  });

  it('keeps special-looking keys as ordinary data', () => {
    expect(
      merged(
        '{"constructor":"old","__proto__":{"x":1}}\n---\n{"constructor":"new","__proto__":{"y":2},"prototype":1}',
      ),
    ).toBe('{"constructor":"new","__proto__":{"x":1,"y":2},"prototype":1}');
    expect(({} as Record<string, unknown>).x).toBeUndefined();
    expect(({} as Record<string, unknown>).y).toBeUndefined();
  });

  it('requires a separator', () => {
    expect(() => mergeDocuments('{"a":1}')).toThrow(JsonToolError);
  });

  it('names the invalid document', () => {
    expect(() => mergeDocuments('{"a":1}\n---\n{oops}')).toThrow(
      /^Document 2 is not valid JSON/,
    );
  });

  it('rejects non-object documents', () => {
    expect(() => mergeDocuments('[1]\n---\n{"a":1}')).toThrow(
      'Document 1 must be a JSON object, not an array.',
    );
  });
});
