import { describe, expect, it } from 'vitest';

import { JsonToGoBoxSource } from '../JsonToGoBoxSource';

describe('JsonToGoBoxSource', () => {
  describe('generateBoxes', () => {
    it('should return [] when no matching option is provided', async () => {
      const boxes = await JsonToGoBoxSource.generateBoxes('{"id":1}', null);
      expect(boxes).toEqual([]);
    });

    it('should return [] when options do not include gostruct or jsontogo', async () => {
      const boxes = await JsonToGoBoxSource.generateBoxes('{"id":1}', {
        json: true,
      });
      expect(boxes).toEqual([]);
    });

    it('should generate a Go struct for a simple object with ::gostruct', async () => {
      const boxes = await JsonToGoBoxSource.generateBoxes(
        '{"id":1,"name":"Bob"}',
        { gostruct: true },
      );
      expect(boxes).toHaveLength(1);
      const out = boxes[0].props.plaintextOutput;
      expect(out).toContain('type Root struct {');
      expect(out).toContain('ID int `json:"id"`');
      expect(out).toContain('Name string `json:"name"`');
    });

    it('should also trigger on ::jsontogo', async () => {
      const boxes = await JsonToGoBoxSource.generateBoxes('{"id":1}', {
        jsontogo: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toContain('type Root struct {');
    });

    it('should use float64 for non-integer numbers', async () => {
      const boxes = await JsonToGoBoxSource.generateBoxes('{"price":1.5}', {
        gostruct: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toContain(
        'Price float64 `json:"price"`',
      );
    });

    it('should use bool for boolean fields', async () => {
      const boxes = await JsonToGoBoxSource.generateBoxes('{"ok":true}', {
        gostruct: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toContain('Ok bool `json:"ok"`');
    });

    it('should use []string for string array fields', async () => {
      const boxes = await JsonToGoBoxSource.generateBoxes('{"tags":["a"]}', {
        gostruct: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toContain(
        'Tags []string `json:"tags"`',
      );
    });

    it('should generate nested structs for object fields', async () => {
      const boxes = await JsonToGoBoxSource.generateBoxes(
        '{"meta":{"ok":true}}',
        { gostruct: true },
      );
      expect(boxes).toHaveLength(1);
      const out = boxes[0].props.plaintextOutput;
      expect(out).toContain('type Meta struct {');
      expect(out).toContain('Ok bool `json:"ok"`');
      expect(out).toContain('Meta Meta `json:"meta"`');
    });

    it('should return an error box for invalid JSON', async () => {
      const boxes = await JsonToGoBoxSource.generateBoxes('not-json', {
        gostruct: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toContain('Error:');
    });
  });
});
