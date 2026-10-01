import { describe, expect, it } from 'vitest';

import { convertJsonl, parseJsonl } from '../jsonl';

const toJsonl = (input: string): string => convertJsonl(input, 'to').output;
const fromJsonl = (input: string): unknown =>
  JSON.parse(convertJsonl(input, 'from').output);

describe('convertJsonl', () => {
  it('converts an array to compact lines', () => {
    expect(toJsonl('[{"a":1}, {"a":2}, 3, "x", null]')).toBe(
      '{"a":1}\n{"a":2}\n3\n"x"\nnull',
    );
  });

  it('accepts a pretty-printed array', () => {
    expect(toJsonl('[\n  {"a": 1},\n  {"a": 2}\n]')).toBe('{"a":1}\n{"a":2}');
  });

  it('converts lines back to an array', () => {
    expect(fromJsonl('{"a":1}\n{"a":2}')).toEqual([{ a: 1 }, { a: 2 }]);
  });

  it.each([
    [
      [
        [1, 2],
        [3, 4],
      ],
    ],
    [[[1, 2]]],
    [[{ a: [1] }, [], 'x', 0, null]],
  ])('round-trips %j through explicit to/from', (value) => {
    const lines = toJsonl(JSON.stringify(value));
    expect(fromJsonl(lines)).toEqual(value);
  });

  it('rejects a non-array for "to"', () => {
    expect(() => convertJsonl('{"a":1}', 'to')).toThrow(/must be a JSON array/);
    expect(() => convertJsonl('{oops', 'to')).toThrow(/not valid JSON/);
  });

  describe('auto', () => {
    it('reads a whole JSON array as "to"', () => {
      expect(convertJsonl('[{"a":1},{"a":2}]', 'auto').direction).toBe('to');
    });

    it('reads multi-line array values as JSONL "from"', () => {
      const result = convertJsonl('[1,2]\n[3,4]', 'auto');
      expect(result.direction).toBe('from');
      expect(JSON.parse(result.output)).toEqual([
        [1, 2],
        [3, 4],
      ]);
    });

    it('reads a single object line as "from"', () => {
      expect(convertJsonl('{"a":1}', 'auto').direction).toBe('from');
    });

    it('cannot tell a one-line array-valued JSONL from an array', () => {
      // documented ambiguity: "from" must be explicit for this shape
      expect(convertJsonl('[1,2]', 'auto').output).toBe('1\n2');
      expect(JSON.parse(convertJsonl('[1,2]', 'from').output)).toEqual([
        [1, 2],
      ]);
    });
  });
});

describe('parseJsonl', () => {
  it('skips blank lines and handles CRLF', () => {
    expect(parseJsonl('1\r\n\r\n2\r\n')).toEqual([1, 2]);
  });

  it('reports the original line number of a bad line', () => {
    expect(() => parseJsonl('{"a":1}\n\n{bad}')).toThrow(/^Line 3 /);
  });

  it('rejects input without any value', () => {
    expect(() => parseJsonl('\n  \n')).toThrow(/no values/);
  });
});
