import { describe, expect, it } from 'vitest';

import { JsonPathBoxSource } from '../JsonPathBoxSource';

describe('JsonPathBoxSource', () => {
  describe('trigger guard', () => {
    it('returns empty array when no option is provided', async () => {
      const boxes = await JsonPathBoxSource.generateBoxes('{"a":1}', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array when unrelated options are provided', async () => {
      const boxes = await JsonPathBoxSource.generateBoxes('{"a":1}', {
        sha256: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('path resolution', () => {
    it('extracts a nested array element with leading $', async () => {
      const boxes = await JsonPathBoxSource.generateBoxes(
        '{"a":{"b":[10,20]}}',
        { jsonpath: '$.a.b[1]' },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('20');
    });

    it('works without leading $ (bare path)', async () => {
      const boxes = await JsonPathBoxSource.generateBoxes(
        '{"a":{"b":[10,20]}}',
        { jsonpath: 'a.b[0]' },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('10');
    });

    it('resolves bracket-quoted key with spaces', async () => {
      const boxes = await JsonPathBoxSource.generateBoxes('{"x":{"y z":1}}', {
        jsonpath: 'x["y z"]',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('1');
    });

    it('returns object result as pretty-printed JSON', async () => {
      const boxes = await JsonPathBoxSource.generateBoxes('{"a":{"b":1}}', {
        jsonpath: 'a',
      });
      expect(boxes).toHaveLength(1);
      expect(JSON.parse(boxes[0].props.plaintextOutput)).toStrictEqual({
        b: 1,
      });
    });

    it('accepts ::jpath alias', async () => {
      const boxes = await JsonPathBoxSource.generateBoxes('{"a":42}', {
        jpath: 'a',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('42');
    });
  });

  describe('not found cases', () => {
    it('returns a not-found box when path does not exist', async () => {
      const boxes = await JsonPathBoxSource.generateBoxes('{"a":1}', {
        jsonpath: 'a.b.c',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput.toLowerCase()).toMatch(/not found/);
    });
  });

  describe('prototype safety', () => {
    it('does not return Object.prototype for __proto__ path', async () => {
      const boxes = await JsonPathBoxSource.generateBoxes('{"a":1}', {
        jsonpath: '__proto__',
      });
      expect(boxes).toHaveLength(1);
      // must not resolve to Object.prototype — output is a not-found message, not an object dump
      expect(boxes[0].props.plaintextOutput.toLowerCase()).toMatch(
        /not found|reserved/,
      );
    });

    it('does not follow constructor segment', async () => {
      const boxes = await JsonPathBoxSource.generateBoxes('{"a":1}', {
        jsonpath: 'constructor',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput.toLowerCase()).toMatch(
        /not found|reserved/,
      );
    });
  });

  describe('error cases', () => {
    it('returns an error box for invalid JSON', async () => {
      const boxes = await JsonPathBoxSource.generateBoxes('{bad', {
        jsonpath: 'a',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput.toLowerCase()).toMatch(
        /invalid json/,
      );
    });

    it('returns a path-required box when ::jsonpath is bare (boolean true)', async () => {
      const boxes = await JsonPathBoxSource.generateBoxes('{"a":1}', {
        jsonpath: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput.toLowerCase()).toMatch(
        /path is required/,
      );
    });
  });

  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(JsonPathBoxSource.name).toBe('JSON Path');
      expect(JsonPathBoxSource.tag).toBe('#');
      expect(JsonPathBoxSource.kind).toBe('Analyze');
      expect(typeof JsonPathBoxSource.priority).toBe('number');
    });
  });
});
