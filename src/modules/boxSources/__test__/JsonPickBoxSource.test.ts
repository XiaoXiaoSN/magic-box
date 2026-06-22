import { describe, expect, it } from 'vitest';

import { JsonPickBoxSource } from '../JsonPickBoxSource';

describe('JsonPickBoxSource', () => {
  describe('trigger guard', () => {
    it('returns [] when neither jsonpick nor jsonomit is provided', async () => {
      const boxes = await JsonPickBoxSource.generateBoxes('{"a":1}', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for empty options', async () => {
      const boxes = await JsonPickBoxSource.generateBoxes('{"a":1}', {});
      expect(boxes).toHaveLength(0);
    });
  });

  describe('pick mode', () => {
    it('picks listed keys and omits the rest', async () => {
      const boxes = await JsonPickBoxSource.generateBoxes(
        '{"a":1,"b":2,"c":3}',
        { jsonpick: 'a,c' },
      );
      expect(boxes).toHaveLength(1);
      const result = JSON.parse(boxes[0].props.plaintextOutput);
      expect(result).toEqual({ a: 1, c: 3 });
      // b must not appear
      expect(Object.hasOwn(result, 'b')).toBe(false);
    });

    it('preserves original key order from the source object', async () => {
      const boxes = await JsonPickBoxSource.generateBoxes(
        '{"a":1,"b":2,"c":3}',
        { jsonpick: 'c,a' },
      );
      const result = JSON.parse(boxes[0].props.plaintextOutput);
      // order follows the original object (a before c), not the requested order
      expect(Object.keys(result)).toEqual(['a', 'c']);
    });

    it('silently skips a requested key that does not exist in the source', async () => {
      const boxes = await JsonPickBoxSource.generateBoxes('{"a":1}', {
        jsonpick: 'a,z',
      });
      const result = JSON.parse(boxes[0].props.plaintextOutput);
      expect(result).toEqual({ a: 1 });
      expect(Object.hasOwn(result, 'z')).toBe(false);
    });

    it('preserves nested values unchanged', async () => {
      const boxes = await JsonPickBoxSource.generateBoxes(
        '{"a":{"x":1},"b":2}',
        { jsonpick: 'a' },
      );
      const result = JSON.parse(boxes[0].props.plaintextOutput);
      expect(result).toEqual({ a: { x: 1 } });
    });
  });

  describe('omit mode', () => {
    it('omits listed keys and retains the rest', async () => {
      const boxes = await JsonPickBoxSource.generateBoxes(
        '{"a":1,"b":2,"c":3}',
        { jsonomit: 'b' },
      );
      expect(boxes).toHaveLength(1);
      const result = JSON.parse(boxes[0].props.plaintextOutput);
      expect(result).toEqual({ a: 1, c: 3 });
    });
  });

  describe('prototype safety', () => {
    it('does not pollute Object.prototype when __proto__ is in the pick list', async () => {
      const boxes = await JsonPickBoxSource.generateBoxes('{"a":1}', {
        jsonpick: '__proto__,a',
      });
      expect(boxes).toHaveLength(1);
      const result = JSON.parse(boxes[0].props.plaintextOutput);
      // a is included, __proto__ is not an own key on the result
      expect(result).toEqual({ a: 1 });
      expect(Object.hasOwn(result, '__proto__')).toBe(false);
      // prototype must not have been polluted
      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    });
  });

  describe('bare flag (usage hint)', () => {
    it('returns a usage box when ::jsonpick is a bare boolean', async () => {
      const boxes = await JsonPickBoxSource.generateBoxes('{"a":1}', {
        jsonpick: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/usage/i);
    });

    it('returns a usage box when ::jsonomit is a bare boolean', async () => {
      const boxes = await JsonPickBoxSource.generateBoxes('{"a":1}', {
        jsonomit: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/usage/i);
    });
  });

  describe('error handling', () => {
    it('returns an error box for invalid JSON', async () => {
      const boxes = await JsonPickBoxSource.generateBoxes('{bad', {
        jsonpick: 'a',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/parse error/i);
    });

    it('returns an error box when input is a JSON array', async () => {
      const boxes = await JsonPickBoxSource.generateBoxes('[1,2]', {
        jsonpick: 'a',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/object/i);
    });

    it('returns an error box when input is a JSON scalar', async () => {
      const boxes = await JsonPickBoxSource.generateBoxes('"hello"', {
        jsonpick: 'a',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/object/i);
    });
  });

  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(JsonPickBoxSource.name).toBe('JSON Pick');
      expect(JsonPickBoxSource.tag).toBe('#');
      expect(JsonPickBoxSource.kind).toBe('Transform');
      expect(typeof JsonPickBoxSource.priority).toBe('number');
    });
  });
});
