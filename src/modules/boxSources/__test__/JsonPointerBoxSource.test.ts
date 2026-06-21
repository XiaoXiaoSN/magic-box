import { CodeBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { JsonPointerBoxSource } from '../JsonPointerBoxSource';

describe('JsonPointerBoxSource', () => {
  const json = '{"a":{"b":[10,20]}}';

  describe('option gating', () => {
    it('returns [] when no option is present', async () => {
      const boxes = await JsonPointerBoxSource.generateBoxes(json, null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when unrelated options are present', async () => {
      const boxes = await JsonPointerBoxSource.generateBoxes(json, {
        foo: 'bar',
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('pointer resolution', () => {
    it('resolves a nested array index', async () => {
      const boxes = await JsonPointerBoxSource.generateBoxes(json, {
        jsonpointer: '/a/b/1',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('20');
      expect(boxes[0].props.name).toBe('JSON Pointer');
      expect(boxes[0].props.priority).toBe(10);
      expect(boxes[0].boxTemplate).toBe(CodeBoxTemplate);
    });

    it('resolves index 0', async () => {
      const boxes = await JsonPointerBoxSource.generateBoxes(json, {
        jsonpointer: '/a/b/0',
      });
      expect(boxes[0].props.plaintextOutput).toBe('10');
    });

    it('resolves an object value directly', async () => {
      const boxes = await JsonPointerBoxSource.generateBoxes('{"x":42}', {
        jsonpointer: '/x',
      });
      expect(boxes[0].props.plaintextOutput).toBe('42');
    });
  });

  describe('RFC 6901 escape sequences', () => {
    it('unescapes ~1 to /', async () => {
      const boxes = await JsonPointerBoxSource.generateBoxes('{"a/b":5}', {
        jsonpointer: '/a~1b',
      });
      expect(boxes[0].props.plaintextOutput).toBe('5');
    });

    it('unescapes ~0 to ~', async () => {
      const boxes = await JsonPointerBoxSource.generateBoxes('{"m~n":7}', {
        jsonpointer: '/m~0n',
      });
      expect(boxes[0].props.plaintextOutput).toBe('7');
    });

    it('handles ~01 per RFC 6901 §3 (~1→/ first, then ~0→~ leaves ~1)', async () => {
      // ~01: no literal ~1 to turn into /, then ~0→~ yields the key "~1"
      const boxes = await JsonPointerBoxSource.generateBoxes('{"~1":99}', {
        jsonpointer: '/~01',
      });
      expect(boxes[0].props.plaintextOutput).toBe('99');
    });
  });

  describe('whole-document pointer', () => {
    it('returns the whole doc when option value is empty string', async () => {
      const boxes = await JsonPointerBoxSource.generateBoxes(json, {
        jsonpointer: '',
      });
      expect(boxes).toHaveLength(1);
      const parsed = JSON.parse(boxes[0].props.plaintextOutput);
      expect(parsed).toEqual({ a: { b: [10, 20] } });
    });

    it('returns the whole doc when option is a bare flag (true)', async () => {
      const boxes = await JsonPointerBoxSource.generateBoxes(json, {
        jsonpointer: true,
      });
      expect(boxes).toHaveLength(1);
      const parsed = JSON.parse(boxes[0].props.plaintextOutput);
      expect(parsed).toEqual({ a: { b: [10, 20] } });
    });

    it('accepts ::jptr alias', async () => {
      const boxes = await JsonPointerBoxSource.generateBoxes(json, {
        jptr: '/a/b/0',
      });
      expect(boxes[0].props.plaintextOutput).toBe('10');
    });
  });

  describe('error cases', () => {
    it('returns a box mentioning "not found" for a missing key', async () => {
      const boxes = await JsonPointerBoxSource.generateBoxes('{"a":1}', {
        jsonpointer: '/x',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput.toLowerCase()).toContain(
        'not found',
      );
    });

    it('returns a box mentioning "not found" for out-of-range array index', async () => {
      const boxes = await JsonPointerBoxSource.generateBoxes('{"a":[1,2]}', {
        jsonpointer: '/a/5',
      });
      expect(boxes[0].props.plaintextOutput.toLowerCase()).toContain(
        'not found',
      );
    });

    it('returns a box mentioning "not found" for RFC 6901 "-" past-end index', async () => {
      const boxes = await JsonPointerBoxSource.generateBoxes('[1,2,3]', {
        jsonpointer: '/-',
      });
      expect(boxes[0].props.plaintextOutput.toLowerCase()).toContain(
        'not found',
      );
    });

    it('returns a box mentioning "invalid" for a pointer not starting with /', async () => {
      const boxes = await JsonPointerBoxSource.generateBoxes('{"a":1}', {
        jsonpointer: 'a/b',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput.toLowerCase()).toContain('invalid');
    });

    it('returns a box mentioning "invalid" for invalid JSON input', async () => {
      const boxes = await JsonPointerBoxSource.generateBoxes('not-json', {
        jsonpointer: '/a',
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput.toLowerCase()).toContain('invalid');
    });
  });
});
