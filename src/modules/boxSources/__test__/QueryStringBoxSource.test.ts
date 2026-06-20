import { describe, expect, it } from 'vitest';

import { QueryStringBoxSource } from '../QueryStringBoxSource';

describe('QueryStringBoxSource', () => {
  describe('generateBoxes', () => {
    it('should return [] when no qs/querystring option is provided', async () => {
      const boxes = await QueryStringBoxSource.generateBoxes('a=1&b=2', null);
      expect(boxes).toEqual([]);
    });

    it('should return [] when unrelated options are provided', async () => {
      const boxes = await QueryStringBoxSource.generateBoxes('a=1&b=2', {
        json: true,
      });
      expect(boxes).toEqual([]);
    });

    it('should parse query string with repeated keys into array', async () => {
      const boxes = await QueryStringBoxSource.generateBoxes('a=1&b=2&b=3', {
        qs: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Query String → JSON');
      const parsed = JSON.parse(boxes[0].props.plaintextOutput);
      expect(parsed).toEqual({ a: '1', b: ['2', '3'] });
    });

    it('should strip leading ? and decode percent-encoded values', async () => {
      const boxes = await QueryStringBoxSource.generateBoxes(
        '?x=hello%20world',
        { qs: true },
      );
      expect(boxes).toHaveLength(1);
      const parsed = JSON.parse(boxes[0].props.plaintextOutput);
      expect(parsed).toEqual({ x: 'hello world' });
    });

    it('should serialize JSON object to query string', async () => {
      const boxes = await QueryStringBoxSource.generateBoxes(
        '{"a":"1","b":["2","3"]}',
        { qs: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('JSON → Query String');
      expect(boxes[0].props.plaintextOutput).toBe('a=1&b=2&b=3');
    });

    it('should percent-encode special characters in JSON values', async () => {
      const boxes = await QueryStringBoxSource.generateBoxes('{"q":"a b&c"}', {
        qs: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('q=a%20b%26c');
    });

    it('should accept ::querystring option alias', async () => {
      const boxes = await QueryStringBoxSource.generateBoxes('x=1', {
        querystring: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Query String → JSON');
    });

    it('should return [] when input exceeds MAX_INPUT', async () => {
      const huge = 'a=1&'.repeat(30_000); // ~120k chars
      const boxes = await QueryStringBoxSource.generateBoxes(huge, {
        qs: true,
      });
      expect(boxes).toEqual([]);
    });
  });
});
