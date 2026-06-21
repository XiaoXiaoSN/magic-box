import { describe, expect, it } from 'vitest';

import { QueryStringBoxSource } from '../QueryStringBoxSource';

describe('QueryStringBoxSource', () => {
  describe('option gating', () => {
    it('returns empty array when no option is provided', async () => {
      const boxes = await QueryStringBoxSource.generateBoxes('a=1&b=2', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array when unrelated options are provided', async () => {
      const boxes = await QueryStringBoxSource.generateBoxes('a=1', {
        json: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('qs → JSON', () => {
    it('converts a simple query string to JSON', async () => {
      const boxes = await QueryStringBoxSource.generateBoxes('a=1&b=2', {
        qs: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Query String → JSON');
      const parsed = JSON.parse(boxes[0].props.plaintextOutput);
      expect(parsed).toEqual({ a: '1', b: '2' });
    });

    it('collects repeated keys into an array', async () => {
      const boxes = await QueryStringBoxSource.generateBoxes('b=2&b=3', {
        qs: true,
      });
      expect(boxes).toHaveLength(1);
      const parsed = JSON.parse(boxes[0].props.plaintextOutput);
      expect(parsed).toEqual({ b: ['2', '3'] });
    });

    it('strips a leading ? and decodes percent-encoded values', async () => {
      const boxes = await QueryStringBoxSource.generateBoxes(
        '?x=hello%20world',
        { qs: true },
      );
      expect(boxes).toHaveLength(1);
      const parsed = JSON.parse(boxes[0].props.plaintextOutput);
      expect(parsed).toEqual({ x: 'hello world' });
    });

    it('accepts ::querystring as an alias', async () => {
      const boxes = await QueryStringBoxSource.generateBoxes('a=1', {
        querystring: true,
      });
      expect(boxes).toHaveLength(1);
    });
  });

  describe('JSON → qs', () => {
    it('converts a flat JSON object to a query string', async () => {
      const boxes = await QueryStringBoxSource.generateBoxes(
        '{"a":"1","b":"2"}',
        { qs: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('JSON → Query String');
      expect(boxes[0].props.plaintextOutput).toBe('a=1&b=2');
    });

    it('emits repeated pairs for array values', async () => {
      const boxes = await QueryStringBoxSource.generateBoxes(
        '{"b":["2","3"]}',
        { qs: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('b=2&b=3');
    });

    it('returns an error box for invalid JSON', async () => {
      const boxes = await QueryStringBoxSource.generateBoxes(
        '{not valid json}',
        { qs: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toContain('error');
    });
  });

  describe('prototype pollution guard', () => {
    it('skips __proto__ key and does not pollute Object.prototype', async () => {
      const boxes = await QueryStringBoxSource.generateBoxes(
        '__proto__=polluted&a=1',
        { qs: true },
      );
      expect(boxes).toHaveLength(1);
      const parsed = JSON.parse(boxes[0].props.plaintextOutput);
      // the legitimate key survives
      expect(parsed.a).toBe('1');
      // the dangerous key is absent from the result
      expect(Object.keys(parsed)).not.toContain('__proto__');
      // Object.prototype is clean
      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    });

    it('skips constructor key', async () => {
      const boxes = await QueryStringBoxSource.generateBoxes(
        'constructor=evil&x=ok',
        { qs: true },
      );
      expect(boxes).toHaveLength(1);
      const parsed = JSON.parse(boxes[0].props.plaintextOutput);
      expect(parsed.x).toBe('ok');
      expect(Object.hasOwn(parsed, 'constructor')).toBe(false);
    });
  });

  describe('encoding round-trip', () => {
    it('round-trips a value with spaces through qs → JSON → qs', async () => {
      const jsonBoxes = await QueryStringBoxSource.generateBoxes(
        'a=hello%20world',
        { qs: true },
      );
      expect(jsonBoxes).toHaveLength(1);
      const parsed = JSON.parse(jsonBoxes[0].props.plaintextOutput);
      expect(parsed.a).toBe('hello world');

      // re-encode back to query string
      const qsBoxes = await QueryStringBoxSource.generateBoxes(
        JSON.stringify(parsed),
        { qs: true },
      );
      expect(qsBoxes).toHaveLength(1);
      expect(qsBoxes[0].props.plaintextOutput).toBe('a=hello%20world');
    });
  });

  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(QueryStringBoxSource.name).toBe('Query String');
      expect(QueryStringBoxSource.tag).toBe('#');
      expect(QueryStringBoxSource.kind).toBe('Convert');
      expect(typeof QueryStringBoxSource.priority).toBe('number');
    });
  });
});
