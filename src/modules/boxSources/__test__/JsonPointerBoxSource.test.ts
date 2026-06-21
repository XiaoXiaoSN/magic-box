import { describe, expect, it } from 'vitest';

import { JsonPointerBoxSource } from '../JsonPointerBoxSource';

const gen = (input: string, options: Record<string, string | boolean>) =>
  JsonPointerBoxSource.generateBoxes(input, options);

describe('JsonPointerBoxSource', () => {
  describe('option gating', () => {
    it('returns [] when no option is present', async () => {
      const boxes = await gen('{"a":1}', {});
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when options is null', async () => {
      const boxes = await JsonPointerBoxSource.generateBoxes('{"a":1}', null);
      expect(boxes).toHaveLength(0);
    });

    it('shows a usage box for bare ::jsonpointer (boolean true)', async () => {
      const boxes = await gen('{"a":1}', { jsonpointer: true });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/Usage/i);
    });
  });

  describe('JSON parse errors', () => {
    it('returns an error box for invalid JSON', async () => {
      const boxes = await gen('{bad', { jsonpointer: '/a' });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/invalid json/i);
    });
  });

  describe('pointer resolution', () => {
    it('resolves /a/b/1 to 2', async () => {
      const boxes = await gen('{"a":{"b":[1,2,3]}}', { jsonpointer: '/a/b/1' });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('2');
    });

    it('resolves empty pointer to the whole document', async () => {
      const doc = '{"a":{"b":[1,2,3]}}';
      const boxes = await gen(doc, { jsonpointer: '' });
      expect(boxes).toHaveLength(1);
      expect(JSON.parse(boxes[0].props.plaintextOutput)).toEqual(
        JSON.parse(doc),
      );
    });

    it('resolves nested string value /x/y', async () => {
      const boxes = await gen('{"x":{"y":"hi"}}', { jsonpointer: '/x/y' });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('"hi"');
    });

    it('accepts ::jsonptr alias', async () => {
      const boxes = await gen('{"a":1}', { jsonptr: '/a' });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('1');
    });
  });

  describe('RFC 6901 escape sequences', () => {
    it('unescapes ~1 to / in key lookup', async () => {
      const boxes = await gen('{"a/b":1}', { jsonpointer: '/a~1b' });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('1');
    });

    it('unescapes ~0 to ~ in key lookup', async () => {
      const boxes = await gen('{"m~n":2}', { jsonpointer: '/m~0n' });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('2');
    });
  });

  describe('not-found / type errors', () => {
    it('returns an error box when key does not exist', async () => {
      const boxes = await gen('{"a":{"b":1}}', { jsonpointer: '/a/z' });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/not found|not resolve/i);
    });

    it('returns an error box when array index is out of bounds', async () => {
      const boxes = await gen('[1,2,3]', { jsonpointer: '/5' });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(
        /out of bounds|not resolve/i,
      );
    });
  });

  describe('prototype safety', () => {
    it('does NOT resolve __proto__ to the prototype object', async () => {
      const boxes = await gen('{}', { jsonpointer: '/__proto__' });
      expect(boxes).toHaveLength(1);
      // must be an error box, not the prototype
      expect(boxes[0].props.plaintextOutput).toMatch(/not found|not resolve/i);
      // make sure it did not accidentally return the Object prototype
      expect(boxes[0].props.plaintextOutput).not.toContain('isPrototypeOf');
    });

    it('does NOT resolve /constructor to Function via prototype', async () => {
      const boxes = await gen('{}', { jsonpointer: '/constructor' });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/not found|not resolve/i);
    });
  });

  describe('metadata', () => {
    it('sets priority on the result box', async () => {
      const boxes = await gen('{"a":1}', { jsonpointer: '/a' });
      expect(boxes[0].props.priority).toBe(JsonPointerBoxSource.priority);
    });

    it('sets box name to JSON Pointer', async () => {
      const boxes = await gen('{"a":1}', { jsonpointer: '/a' });
      expect(boxes[0].props.name).toBe('JSON Pointer');
    });

    it('rejects a leading-zero array index per RFC 6901', async () => {
      const boxes = await gen('{"a":[10,20,30]}', { jsonpointer: '/a/01' });
      expect(boxes[0].props.plaintextOutput).toMatch(/valid array index|not/i);
    });
  });
});
