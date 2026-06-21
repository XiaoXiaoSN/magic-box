import { describe, expect, it } from 'vitest';

import { JsonPathBoxSource } from '../JsonPathBoxSource';

describe('JsonPathBoxSource', () => {
  describe('option gating', () => {
    it('returns empty array when no jsonpath option is present', async () => {
      const boxes = await JsonPathBoxSource.generateBoxes('{"a":1}', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty options object', async () => {
      const boxes = await JsonPathBoxSource.generateBoxes('{"a":1}', {});
      expect(boxes).toHaveLength(0);
    });
  });

  describe('path required message', () => {
    it('returns a box explaining a path is required when ::jsonpath has no value', async () => {
      const boxes = await JsonPathBoxSource.generateBoxes('{"a":1}', {
        jsonpath: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/path is required/i);
    });

    it('returns a path-required box for ::jpath alias with no value', async () => {
      const boxes = await JsonPathBoxSource.generateBoxes('{"a":1}', {
        jpath: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/path is required/i);
    });
  });

  describe('invalid JSON', () => {
    it('returns a box mentioning invalid JSON when input cannot be parsed', async () => {
      const boxes = await JsonPathBoxSource.generateBoxes('{bad}', {
        jsonpath: 'a',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/invalid json/i);
    });
  });

  describe('path not found', () => {
    it('returns a box mentioning not found when path does not exist', async () => {
      const boxes = await JsonPathBoxSource.generateBoxes('{"a":1}', {
        jsonpath: 'a.b.c',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/not found/i);
    });
  });

  describe('successful extraction', () => {
    it('extracts a nested array element via dot/bracket path', async () => {
      const boxes = await JsonPathBoxSource.generateBoxes(
        '{"a":{"b":[10,20,30]}}',
        { jsonpath: 'a.b[1]' },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('20');
    });

    it('extracts a nested string value via dot path', async () => {
      const boxes = await JsonPathBoxSource.generateBoxes('{"x":{"y":"hi"}}', {
        jsonpath: 'x.y',
      });
      expect(boxes).toHaveLength(1);
      // JSON.stringify of a string includes quotes
      expect(boxes[0].props.plaintextOutput).toBe('"hi"');
    });

    it('extracts a value via bracket key with a space', async () => {
      const boxes = await JsonPathBoxSource.generateBoxes('{"weird key":5}', {
        jsonpath: '["weird key"]',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('5');
    });

    it('extracts an object and pretty-prints it', async () => {
      const boxes = await JsonPathBoxSource.generateBoxes(
        '{"a":{"b":{"c":42}}}',
        { jsonpath: 'a.b' },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe(
        JSON.stringify({ c: 42 }, null, 2),
      );
    });

    it('supports ::jpath alias', async () => {
      const boxes = await JsonPathBoxSource.generateBoxes(
        '{"a":{"b":[10,20,30]}}',
        { jpath: 'a.b[1]' },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('20');
    });
  });

  describe('numeric-looking keys', () => {
    it('treats a non-pure-digit segment as a string key, not an index', async () => {
      const boxes = await JsonPathBoxSource.generateBoxes('{"123abc":7}', {
        jsonpath: '123abc',
      });
      expect(boxes[0].props.plaintextOutput).toBe('7');
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
