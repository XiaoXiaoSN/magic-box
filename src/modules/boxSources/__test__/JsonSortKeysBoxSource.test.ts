import { describe, expect, it } from 'vitest';

import { JsonSortKeysBoxSource } from '../JsonSortKeysBoxSource';

describe('JsonSortKeysBoxSource', () => {
  describe('generateBoxes', () => {
    it('should return empty array when no trigger option is provided', async () => {
      const boxes = await JsonSortKeysBoxSource.generateBoxes(
        '{"b":1,"a":2}',
        {},
      );
      expect(boxes).toHaveLength(0);
    });

    it('should return empty array when options is null', async () => {
      const boxes = await JsonSortKeysBoxSource.generateBoxes(
        '{"b":1,"a":2}',
        null,
      );
      expect(boxes).toHaveLength(0);
    });

    it('should sort object keys ascending by default with ::jsonsort', async () => {
      const boxes = await JsonSortKeysBoxSource.generateBoxes(
        '{"b":1,"a":{"d":4,"c":3}}',
        { jsonsort: true },
      );

      expect(boxes).toHaveLength(1);

      const output = boxes[0].props.plaintextOutput;
      const parsed = JSON.parse(output);

      // deep value equality
      expect(parsed).toEqual({ a: { c: 3, d: 4 }, b: 1 });

      // key order in serialised output: "a" must appear before "b", "c" before "d"
      expect(output.indexOf('"a"')).toBeLessThan(output.indexOf('"b"'));
      expect(output.indexOf('"c"')).toBeLessThan(output.indexOf('"d"'));
    });

    it('should sort keys descending when ::jsonsort=desc', async () => {
      const boxes = await JsonSortKeysBoxSource.generateBoxes('{"a":1,"b":2}', {
        jsonsort: 'desc',
      });

      expect(boxes).toHaveLength(1);

      const output = boxes[0].props.plaintextOutput;
      // "b" must appear before "a" in descending order
      expect(output.indexOf('"b"')).toBeLessThan(output.indexOf('"a"'));
    });

    it('should also trigger on ::sortkeys option', async () => {
      const boxes = await JsonSortKeysBoxSource.generateBoxes('{"b":1,"a":2}', {
        sortkeys: true,
      });

      expect(boxes).toHaveLength(1);

      const output = boxes[0].props.plaintextOutput;
      expect(output.indexOf('"a"')).toBeLessThan(output.indexOf('"b"'));
    });

    it('should preserve array element order (not sort array contents)', async () => {
      const boxes = await JsonSortKeysBoxSource.generateBoxes('{"x":[3,1,2]}', {
        jsonsort: true,
      });

      expect(boxes).toHaveLength(1);

      const parsed = JSON.parse(boxes[0].props.plaintextOutput);
      expect(parsed.x).toEqual([3, 1, 2]);
    });

    it('should sort keys inside objects that are elements of an array', async () => {
      const boxes = await JsonSortKeysBoxSource.generateBoxes(
        '[{"b":1,"a":2}]',
        { jsonsort: true },
      );

      expect(boxes).toHaveLength(1);

      const output = boxes[0].props.plaintextOutput;
      const parsed = JSON.parse(output);

      expect(parsed[0]).toEqual({ a: 2, b: 1 });
      // "a" must come before "b" in the serialised output
      expect(output.indexOf('"a"')).toBeLessThan(output.indexOf('"b"'));
    });

    it('should return an error box for invalid JSON', async () => {
      const boxes = await JsonSortKeysBoxSource.generateBoxes('{bad', {
        jsonsort: true,
      });

      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toContain('Invalid JSON');
    });

    it('should not pollute Object prototype when __proto__ is a JSON key', async () => {
      const input = '{"__proto__":{"x":1},"a":2}';
      await JsonSortKeysBoxSource.generateBoxes(input, { jsonsort: true });

      // prototype pollution would make ({}).x === 1
      expect(({} as Record<string, unknown>).x).toBeUndefined();
    });

    it('should set language option to json on the output box', async () => {
      const boxes = await JsonSortKeysBoxSource.generateBoxes('{"b":1,"a":2}', {
        jsonsort: true,
      });

      expect(boxes[0].props.options).toEqual({ language: 'json' });
    });
  });
});
