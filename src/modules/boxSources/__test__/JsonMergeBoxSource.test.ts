import { describe, expect, it } from 'vitest';

import { JsonMergeBoxSource } from '../JsonMergeBoxSource';

describe('JsonMergeBoxSource', () => {
  describe('generateBoxes', () => {
    it('returns empty array when no trigger option is present', async () => {
      const boxes = await JsonMergeBoxSource.generateBoxes(
        '{"a":1}\n---\n{"b":2}',
        null,
      );
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array when options object has no matching key', async () => {
      const boxes = await JsonMergeBoxSource.generateBoxes(
        '{"a":1}\n---\n{"b":2}',
        { format: true },
      );
      expect(boxes).toHaveLength(0);
    });

    it('deep-merges nested objects (second overrides first on conflict)', async () => {
      const boxes = await JsonMergeBoxSource.generateBoxes(
        '{"a":1,"b":{"x":1}}\n---\n{"b":{"y":2},"c":3}',
        { jsonmerge: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('JSON Merge');
      expect(JSON.parse(boxes[0].props.plaintextOutput)).toEqual({
        a: 1,
        b: { x: 1, y: 2 },
        c: 3,
      });
    });

    it('triggers on ::merge option as well', async () => {
      const boxes = await JsonMergeBoxSource.generateBoxes(
        '{"a":1}\n---\n{"a":2}',
        { merge: true },
      );
      expect(boxes).toHaveLength(1);
    });

    it('overrides scalar value from first doc with second', async () => {
      const boxes = await JsonMergeBoxSource.generateBoxes(
        '{"a":1}\n---\n{"a":2}',
        { jsonmerge: true },
      );
      expect(boxes).toHaveLength(1);
      expect(JSON.parse(boxes[0].props.plaintextOutput)).toEqual({ a: 2 });
    });

    it('replaces arrays rather than concatenating them', async () => {
      const boxes = await JsonMergeBoxSource.generateBoxes(
        '{"a":[1,2]}\n---\n{"a":[3]}',
        { jsonmerge: true },
      );
      expect(boxes).toHaveLength(1);
      expect(JSON.parse(boxes[0].props.plaintextOutput)).toEqual({ a: [3] });
    });

    it('guards against prototype pollution via __proto__ key', async () => {
      const boxes = await JsonMergeBoxSource.generateBoxes(
        '{}\n---\n{"__proto__":{"polluted":true}}',
        { jsonmerge: true },
      );
      // merge itself must succeed without throwing
      expect(boxes).toHaveLength(1);
      // Object.prototype must remain clean
      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    });

    it('returns an error box when the separator is missing', async () => {
      const boxes = await JsonMergeBoxSource.generateBoxes('{"a":1}', {
        jsonmerge: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/---/);
    });

    it('returns an error box when the first document is invalid JSON', async () => {
      const boxes = await JsonMergeBoxSource.generateBoxes('{bad\n---\n{}', {
        jsonmerge: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/first/i);
    });

    it('returns an error box when the second document is invalid JSON', async () => {
      const boxes = await JsonMergeBoxSource.generateBoxes('{}\n---\n{bad', {
        jsonmerge: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/second/i);
    });

    it('uses CodeBoxTemplate with language:json for successful merge', async () => {
      const boxes = await JsonMergeBoxSource.generateBoxes(
        '{"a":1}\n---\n{"b":2}',
        { jsonmerge: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.language).toBe('json');
      expect(boxes[0].boxTemplate).toBeDefined();
    });

    it('sets priority on the returned box', async () => {
      const boxes = await JsonMergeBoxSource.generateBoxes(
        '{"a":1}\n---\n{"b":2}',
        { jsonmerge: true },
      );
      expect(boxes[0].props.priority).toBe(10);
    });
  });
});
