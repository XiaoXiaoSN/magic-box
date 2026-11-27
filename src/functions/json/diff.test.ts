import { describe, expect, it } from 'vitest';
import { compareJson } from './diff';

describe('JSON comparison', () => {
  it('ignores formatting, key order, and equivalent number spellings', () => {
    expect(
      compareJson(
        '{"x": 1, "z": -0, "wide": 1e9007199254740993001}',
        '{"wide": 10e9007199254740993000, "z": 0, "x": 1.00}',
      ),
    ).toEqual({ ok: true, output: '[]', patch: '[]' });
  });

  it('distinguishes huge numbers, null and type changes without re-encoding values', () => {
    const result = compareJson(
      '{"a/~":9007199254740993,"b":null,"z":1e9007199254740993000}',
      '{"a/~":9007199254740994,"b":"null","z":1e9007199254740993001}',
    );
    if (!result.ok) throw new Error(result.message);
    expect(result.output).toContain('"before": 9007199254740993');
    expect(result.patch).toContain('"path": "/a~1~0"');
    expect(result.patch).toContain('"value": 9007199254740994');
    expect(result.patch).toContain('"value": "null"');
    expect(result.patch).toContain('"value": 1e9007199254740993001');
  });

  it('produces ordered array operations and a root replacement', () => {
    const result = compareJson('{"arr":[0,1,2,3]}', '{"arr":[4,1]}');
    if (!result.ok) throw new Error(result.message);
    expect(JSON.parse(result.patch)).toEqual([
      { op: 'replace', path: '/arr/0', value: 4 },
      { op: 'remove', path: '/arr/3' },
      { op: 'remove', path: '/arr/2' },
    ]);
    const root = compareJson('{}', 'null');
    if (!root.ok) throw new Error(root.message);
    expect(JSON.parse(root.patch)).toEqual([
      { op: 'replace', path: '', value: null },
    ]);
  });

  it('reports the combined size limit and which document cannot be parsed', () => {
    expect(compareJson('[]', `"${'a'.repeat(20_000)}"`)).toMatchObject({
      ok: false,
      message: expect.stringContaining('20000'),
    });
    expect(compareJson('[]', '{')).toMatchObject({
      ok: false,
      message: expect.stringContaining('Second input'),
    });
  });
});
