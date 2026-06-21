import { CodeBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';
import { JsonFlattenBoxSource } from '../JsonFlattenBoxSource';

describe('JsonFlattenBoxSource', () => {
  describe('no option → empty array', () => {
    it('returns [] when no flatten/unflatten option is given', async () => {
      const boxes = await JsonFlattenBoxSource.generateBoxes(
        '{"a":{"b":1}}',
        null,
      );
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when unrelated options are given', async () => {
      const boxes = await JsonFlattenBoxSource.generateBoxes('{"a":1}', {
        qrcode: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('flatten', () => {
    it('flattens nested JSON to dot/bracket keys', async () => {
      const boxes = await JsonFlattenBoxSource.generateBoxes(
        '{"a":{"b":1,"c":[2,3]}}',
        { flatten: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('JSON Flatten');
      expect(boxes[0].boxTemplate).toBe(CodeBoxTemplate);
      expect(boxes[0].props.options).toEqual({ language: 'json' });
      const result = JSON.parse(boxes[0].props.plaintextOutput);
      expect(result).toEqual({ 'a.b': 1, 'a.c[0]': 2, 'a.c[1]': 3 });
    });

    it('accepts ::jsonflatten alias', async () => {
      const boxes = await JsonFlattenBoxSource.generateBoxes('{"x":{"y":42}}', {
        jsonflatten: true,
      });
      expect(boxes).toHaveLength(1);
      const result = JSON.parse(boxes[0].props.plaintextOutput);
      expect(result).toEqual({ 'x.y': 42 });
    });

    it('handles empty object as leaf value', async () => {
      const boxes = await JsonFlattenBoxSource.generateBoxes('{"a":{}}', {
        flatten: true,
      });
      expect(boxes).toHaveLength(1);
      const result = JSON.parse(boxes[0].props.plaintextOutput);
      expect(result).toEqual({ a: {} });
    });

    it('handles empty array as leaf value', async () => {
      const boxes = await JsonFlattenBoxSource.generateBoxes('{"a":[]}', {
        flatten: true,
      });
      expect(boxes).toHaveLength(1);
      const result = JSON.parse(boxes[0].props.plaintextOutput);
      expect(result).toEqual({ a: [] });
    });

    it('handles null and boolean primitives', async () => {
      const boxes = await JsonFlattenBoxSource.generateBoxes(
        '{"a":null,"b":true,"c":false}',
        { flatten: true },
      );
      expect(boxes).toHaveLength(1);
      const result = JSON.parse(boxes[0].props.plaintextOutput);
      expect(result).toEqual({ a: null, b: true, c: false });
    });
  });

  describe('unflatten', () => {
    it('rebuilds nested JSON from flat dot/bracket keys', async () => {
      const boxes = await JsonFlattenBoxSource.generateBoxes(
        '{"a.b":1,"a.c[0]":2,"a.c[1]":3}',
        { unflatten: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('JSON Flatten');
      expect(boxes[0].boxTemplate).toBe(CodeBoxTemplate);
      const result = JSON.parse(boxes[0].props.plaintextOutput);
      expect(result).toEqual({ a: { b: 1, c: [2, 3] } });
    });

    it('accepts ::jsonunflatten alias', async () => {
      const boxes = await JsonFlattenBoxSource.generateBoxes('{"x.y":42}', {
        jsonunflatten: true,
      });
      expect(boxes).toHaveLength(1);
      const result = JSON.parse(boxes[0].props.plaintextOutput);
      expect(result).toEqual({ x: { y: 42 } });
    });
  });

  describe('round-trip', () => {
    it('unflatten(flatten(x)) deep-equals x', async () => {
      const fixture = {
        a: { b: 1, c: [2, 3] },
        d: { e: { f: 'hello' } },
        g: [true, null, 0],
      };
      const flatBoxes = await JsonFlattenBoxSource.generateBoxes(
        JSON.stringify(fixture),
        { flatten: true },
      );
      expect(flatBoxes).toHaveLength(1);

      const flatJson = flatBoxes[0].props.plaintextOutput;

      const unflatBoxes = await JsonFlattenBoxSource.generateBoxes(flatJson, {
        unflatten: true,
      });
      expect(unflatBoxes).toHaveLength(1);

      const result = JSON.parse(unflatBoxes[0].props.plaintextOutput);
      expect(result).toEqual(fixture);
    });
  });

  describe('error handling', () => {
    it('returns an error box for invalid JSON with ::flatten', async () => {
      const boxes = await JsonFlattenBoxSource.generateBoxes('{bad}', {
        flatten: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('JSON Flatten');
      // error box output should mention the failure
      expect(boxes[0].props.plaintextOutput.toLowerCase()).toContain('invalid');
    });

    it('returns an error box for invalid JSON with ::unflatten', async () => {
      const boxes = await JsonFlattenBoxSource.generateBoxes('{bad}', {
        unflatten: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput.toLowerCase()).toContain('invalid');
    });
  });
});
