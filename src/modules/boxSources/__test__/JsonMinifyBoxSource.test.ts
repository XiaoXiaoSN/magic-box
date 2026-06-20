import { describe, expect, it } from 'vitest';

import { JsonMinifyBoxSource } from '../JsonMinifyBoxSource';

describe('JsonMinifyBoxSource', () => {
  describe('option gating', () => {
    it('returns empty array when no option is provided', async () => {
      const boxes = await JsonMinifyBoxSource.generateBoxes('{ "a": 1 }', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty options object', async () => {
      const boxes = await JsonMinifyBoxSource.generateBoxes('{ "a": 1 }', {});
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for unrelated option', async () => {
      const boxes = await JsonMinifyBoxSource.generateBoxes('{ "a": 1 }', {
        hash: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('empty input', () => {
    it('returns empty array for empty string with ::jsonmin', async () => {
      const boxes = await JsonMinifyBoxSource.generateBoxes('', {
        jsonmin: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for whitespace-only input with ::jsonmin', async () => {
      const boxes = await JsonMinifyBoxSource.generateBoxes('   ', {
        jsonmin: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('::jsonmin option', () => {
    it('minifies a simple flat object', async () => {
      const boxes = await JsonMinifyBoxSource.generateBoxes(
        '{ "a": 1, "b": [1, 2, 3] }',
        { jsonmin: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('{"a":1,"b":[1,2,3]}');
    });

    it('collapses pretty-printed multi-line JSON to a single compact line', async () => {
      const pretty = `{
  "name": "magic-box",
  "version": "1.0.0",
  "active": true
}`;
      const boxes = await JsonMinifyBoxSource.generateBoxes(pretty, {
        jsonmin: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe(
        '{"name":"magic-box","version":"1.0.0","active":true}',
      );
      // result must be a single line
      expect(boxes[0].props.plaintextOutput).not.toContain('\n');
    });

    it('minifies a nested object', async () => {
      const boxes = await JsonMinifyBoxSource.generateBoxes(
        '{ "x": { "y": 2 } }',
        { jsonmin: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('{"x":{"y":2}}');
    });
  });

  describe('::minifyjson alias', () => {
    it('also triggers on ::minifyjson', async () => {
      const boxes = await JsonMinifyBoxSource.generateBoxes('{ "a": 1 }', {
        minifyjson: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('{"a":1}');
    });
  });

  describe('invalid JSON', () => {
    it('returns a box mentioning invalid JSON for malformed input', async () => {
      const boxes = await JsonMinifyBoxSource.generateBoxes('{bad}', {
        jsonmin: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('JSON Minify');
      expect(boxes[0].props.plaintextOutput.toLowerCase()).toContain('invalid');
    });

    it('returns a box for trailing-comma JSON', async () => {
      const boxes = await JsonMinifyBoxSource.generateBoxes('{ "a": 1, }', {
        jsonmin: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput.toLowerCase()).toContain('invalid');
    });
  });

  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(JsonMinifyBoxSource.name).toBe('JSON Minify');
      expect(JsonMinifyBoxSource.tag).toBe('#');
      expect(JsonMinifyBoxSource.kind).toBe('Transform');
      expect(typeof JsonMinifyBoxSource.priority).toBe('number');
    });
  });
});
