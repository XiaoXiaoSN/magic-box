import { describe, expect, it } from 'vitest';

import { evaluatePointer, parsePointer } from '../pointer';
import { JsonToolError, type JsonValue } from '../shared';

// RFC 6901 §5 example document
const RFC_DOC = JSON.parse(`{
  "foo": ["bar", "baz"],
  "": 0,
  "a/b": 1,
  "c%d": 2,
  "e^f": 3,
  "g|h": 4,
  "i\\\\j": 5,
  "k\\"l": 6,
  " ": 7,
  "m~n": 8
}`) as JsonValue;

describe('evaluatePointer', () => {
  it.each([
    ['', RFC_DOC],
    ['/foo', ['bar', 'baz']],
    ['/foo/0', 'bar'],
    ['/', 0],
    ['/a~1b', 1],
    ['/c%d', 2],
    ['/e^f', 3],
    ['/g|h', 4],
    ['/i\\j', 5],
    ['/k"l', 6],
    ['/ ', 7],
    ['/m~0n', 8],
  ])('resolves RFC 6901 example %j', (pointer, expected) => {
    expect(evaluatePointer(RFC_DOC, pointer)).toEqual(expected);
  });

  it('decodes ~01 to a literal ~1, not /', () => {
    expect(evaluatePointer({ '~1': 'tilde-one', '/': 'slash' }, '/~01')).toBe(
      'tilde-one',
    );
  });

  it.each(['/a~2b', '/a~', '/~x'])('rejects invalid escape in %j', (p) => {
    expect(() => evaluatePointer({ 'a~2b': 1 }, p)).toThrow(
      /must be followed by 0 or 1/,
    );
  });

  it('rejects a pointer without a leading slash', () => {
    expect(() => parsePointer('a/b')).toThrow(JsonToolError);
  });

  it('rejects leading-zero, non-numeric and "-" array indexes', () => {
    expect(() => evaluatePointer([1, 2], '/01')).toThrow(/valid array index/);
    expect(() => evaluatePointer([1, 2], '/x')).toThrow(/valid array index/);
    expect(() => evaluatePointer([1, 2], '/-')).toThrow(/does not exist/);
  });

  it('reports out-of-bounds indexes and missing keys', () => {
    expect(() => evaluatePointer([1], '/1')).toThrow(/out of bounds/);
    expect(() => evaluatePointer({ a: 1 }, '/b')).toThrow(/not found/);
  });

  it('refuses to index into a scalar', () => {
    expect(() => evaluatePointer({ a: 1 }, '/a/b')).toThrow(/cannot index/);
  });

  it('never resolves inherited members', () => {
    expect(() => evaluatePointer({}, '/constructor')).toThrow(/not found/);
    expect(() => evaluatePointer({}, '/__proto__')).toThrow(/not found/);
  });

  it('resolves own special-looking keys', () => {
    const doc = JSON.parse('{"__proto__":{"x":1}}') as JsonValue;
    expect(evaluatePointer(doc, '/__proto__/x')).toBe(1);
  });
});
