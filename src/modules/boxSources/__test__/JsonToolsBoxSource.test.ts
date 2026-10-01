import { parseInput } from '@functions/parseOptions';
import { describe, expect, it } from 'vitest';

import { JsonToolsBoxSource } from '../JsonToolsBoxSource';

// drive the source through the real text entry point, so directive placement
// and option values are exercised exactly as typed in the box
const run = (raw: string) => {
  const [input, options] = parseInput(raw);
  return JsonToolsBoxSource.generateBoxes(input, options);
};

const single = async (raw: string) => {
  const boxes = await run(raw);
  expect(boxes).toHaveLength(1);
  return boxes[0].props;
};

describe('JsonToolsBoxSource', () => {
  it('renders its defaultInput as a merge result', async () => {
    const box = await single(JsonToolsBoxSource.defaultInput);
    expect(box.name).toBe('JSON Merge');
    expect(JSON.parse(box.plaintextOutput)).toEqual({
      a: 1,
      b: { x: 1, y: 2 },
      c: 3,
    });
  });

  describe('trigger guard', () => {
    it('ignores input without a JSON Tools directive', async () => {
      expect(await run('{"a":1}')).toEqual([]);
      expect(await run('{"a":1}\n::json')).toEqual([]);
    });

    it('ignores a same-line directive the parser does not extract', async () => {
      expect(await run('{"a":1,"b":2} ::jsonpick=a')).toEqual([]);
    });

    it('stays silent while only the directive is typed', async () => {
      expect(await run('::jsonpick=a')).toEqual([]);
    });
  });

  describe('merge', () => {
    it.each(['jsonmerge', 'merge'])('runs on ::%s', async (key) => {
      const box = await single(`{"a":1}\n---\n{"b":2}\n::${key}`);
      expect(box.name).toBe('JSON Merge');
      expect(box.options).toEqual({ language: 'json' });
      expect(JSON.parse(box.plaintextOutput)).toEqual({ a: 1, b: 2 });
    });

    it('reports a missing separator', async () => {
      const box = await single('{"a":1}\n::jsonmerge');
      expect(box.name).toBe('JSON Tools');
      expect(box.plaintextOutput).toMatch(/separated by a line/);
    });
  });

  describe('pick / omit', () => {
    it('picks keys', async () => {
      const box = await single('{"a":1,"b":2,"c":3}\n::jsonpick=a,c');
      expect(box.name).toBe('JSON Pick');
      expect(JSON.parse(box.plaintextOutput)).toEqual({ a: 1, c: 3 });
    });

    it('omits keys and keeps data named like prototype members', async () => {
      const box = await single('{"constructor":"data","a":1}\n::jsonomit=a');
      expect(box.name).toBe('JSON Omit');
      expect(box.plaintextOutput).toBe('{\n  "constructor": "data"\n}');
    });

    it.each([
      '::jsonpick',
      '::jsonpick=',
      '::jsonomit= , ',
    ])('shows usage for %j', async (directive) => {
      const box = await single(`{"a":1}\n${directive}`);
      expect(box.plaintextOutput).toMatch(/^Usage: .*::json(pick|omit)=a,b/);
    });

    it('rejects a non-object input', async () => {
      const box = await single('[1]\n::jsonpick=a');
      expect(box.plaintextOutput).toBe(
        'Input must be a JSON object, not an array.',
      );
    });
  });

  describe('pointer', () => {
    it.each(['jsonpointer', 'jsonptr'])('resolves on ::%s', async (key) => {
      const box = await single(`{"a":{"b":[1,2,3]}}\n::${key}=/a/b/1`);
      expect(box.name).toBe('JSON Pointer');
      expect(box.plaintextOutput).toBe('2');
    });

    it.each([
      '::jsonpointer',
      '::jsonpointer=',
    ])('treats %j as the empty pointer (whole document)', async (directive) => {
      const box = await single(`{"a":1}\n${directive}`);
      expect(box.plaintextOutput).toBe('{\n  "a": 1\n}');
    });

    it('reports an invalid escape', async () => {
      const box = await single('{"a~2b":1}\n::jsonpointer=/a~2b');
      expect(box.name).toBe('JSON Tools');
      expect(box.plaintextOutput).toMatch(/must be followed by 0 or 1/);
    });
  });

  describe('jsonl', () => {
    it.each([
      'jsonl',
      'ndjson',
      'tojsonl',
    ])('converts an array to lines on ::%s', async (key) => {
      const box = await single(`[{"a":1},{"a":2}]\n::${key}`);
      expect(box.name).toBe('To JSONL');
      expect(box.plaintextOutput).toBe('{"a":1}\n{"a":2}');
    });

    it('round-trips nested arrays through ::tojsonl and ::fromjsonl', async () => {
      const lines = (await single('[[1,2],[3,4]]\n::tojsonl')).plaintextOutput;
      const back = await single(`${lines}\n::fromjsonl`);
      expect(back.name).toBe('From JSONL');
      expect(JSON.parse(back.plaintextOutput)).toEqual([
        [1, 2],
        [3, 4],
      ]);
    });

    it('auto mode reads multi-line array values as JSONL', async () => {
      const box = await single('[1,2]\n[3,4]\n::jsonl');
      expect(box.name).toBe('From JSONL');
    });
  });

  describe('errors', () => {
    it('rejects two different operations', async () => {
      const box = await single('{"a":1}\n::jsonpick=a\n::tojsonl');
      expect(box.name).toBe('JSON Tools');
      expect(box.plaintextOutput).toBe(
        'Use one JSON Tools operation at a time (got ::jsonpick, ::tojsonl).',
      );
    });

    it('treats aliases of one operation as a single request', async () => {
      const box = await single('[1]\n::jsonl\n::ndjson');
      expect(box.name).toBe('To JSONL');
    });

    it('reports oversized input instead of going silent', async () => {
      const big = `[${'1,'.repeat(60_000)}1]`;
      const box = await single(`${big}\n::tojsonl`);
      expect(box.plaintextOutput).toMatch(/^Input is too large/);
    });

    it('reports invalid JSON', async () => {
      const box = await single('{oops}\n::jsonpointer=/a');
      expect(box.plaintextOutput).toMatch(/^Input is not valid JSON/);
    });
  });
});
