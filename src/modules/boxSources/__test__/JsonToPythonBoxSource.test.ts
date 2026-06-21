import { describe, expect, it } from 'vitest';

import { JsonToPythonBoxSource } from '../JsonToPythonBoxSource';

describe('JsonToPythonBoxSource', () => {
  describe('generateBoxes', () => {
    it('should return [] when no trigger option is provided', async () => {
      const boxes = await JsonToPythonBoxSource.generateBoxes('{"id":1}', null);
      expect(boxes).toHaveLength(0);
    });

    it('should return [] when unrelated options are provided', async () => {
      const boxes = await JsonToPythonBoxSource.generateBoxes('{"id":1}', {
        yaml: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('should generate a dataclass for a flat object with ::pydataclass', async () => {
      const boxes = await JsonToPythonBoxSource.generateBoxes(
        '{"id":1,"name":"Bob"}',
        {
          pydataclass: true,
        },
      );
      expect(boxes).toHaveLength(1);
      const out = boxes[0].props.plaintextOutput;
      expect(out).toContain('@dataclass');
      expect(out).toContain('class Root:');
      expect(out).toContain('id: int');
      expect(out).toContain('name: str');
    });

    it('should trigger with ::jsontopython option', async () => {
      const boxes = await JsonToPythonBoxSource.generateBoxes('{"id":1}', {
        jsontopython: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toContain('class Root:');
    });

    it('should map float numbers to float type', async () => {
      const boxes = await JsonToPythonBoxSource.generateBoxes('{"price":1.5}', {
        pydataclass: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toContain('price: float');
    });

    it('should map boolean values to bool type', async () => {
      const boxes = await JsonToPythonBoxSource.generateBoxes('{"ok":true}', {
        pydataclass: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toContain('ok: bool');
    });

    it('should map arrays of strings to List[str]', async () => {
      const boxes = await JsonToPythonBoxSource.generateBoxes(
        '{"tags":["a"]}',
        {
          pydataclass: true,
        },
      );
      expect(boxes).toHaveLength(1);
      const out = boxes[0].props.plaintextOutput;
      expect(out).toContain('from typing import');
      expect(out).toContain('List');
      expect(out).toContain('tags: List[str]');
    });

    it('should map empty arrays to List[Any]', async () => {
      const boxes = await JsonToPythonBoxSource.generateBoxes('{"items":[]}', {
        pydataclass: true,
      });
      expect(boxes).toHaveLength(1);
      const out = boxes[0].props.plaintextOutput;
      expect(out).toContain('items: List[Any]');
    });

    it('should map null values to Optional[Any]', async () => {
      const boxes = await JsonToPythonBoxSource.generateBoxes(
        '{"value":null}',
        {
          pydataclass: true,
        },
      );
      expect(boxes).toHaveLength(1);
      const out = boxes[0].props.plaintextOutput;
      expect(out).toContain('value: Optional[Any]');
    });

    it('should generate nested dataclass for nested objects', async () => {
      const boxes = await JsonToPythonBoxSource.generateBoxes(
        '{"meta":{"ok":true}}',
        {
          pydataclass: true,
        },
      );
      expect(boxes).toHaveLength(1);
      const out = boxes[0].props.plaintextOutput;
      // nested class must appear before Root
      const metaIdx = out.indexOf('class Meta:');
      const rootIdx = out.indexOf('class Root:');
      expect(metaIdx).toBeGreaterThanOrEqual(0);
      expect(rootIdx).toBeGreaterThan(metaIdx);
      expect(out).toContain('ok: bool');
      expect(out).toContain('meta: Meta');
    });

    it('should de-duplicate class names when two keys normalise to the same PascalCase', async () => {
      // 'my_data' → MyData, 'myData' → Mydata — both normalise similarly; must produce distinct names
      const boxes = await JsonToPythonBoxSource.generateBoxes(
        '{"my_data":{"x":1},"myData":{"y":2}}',
        { pydataclass: true },
      );
      expect(boxes).toHaveLength(1);
      const out = boxes[0].props.plaintextOutput;
      // collect all class names defined in the output
      const classNames = [...out.matchAll(/^class (\w+):/gm)].map((m) => m[1]);
      // all class names must be unique
      const unique = new Set(classNames);
      expect(unique.size).toBe(classNames.length);
      // at least 3 classes: two nested + Root
      expect(classNames.length).toBeGreaterThanOrEqual(3);
    });

    it('should return an error box for invalid JSON', async () => {
      const boxes = await JsonToPythonBoxSource.generateBoxes('{bad', {
        pydataclass: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/error/i);
    });

    it('should include from dataclasses import dataclass in output', async () => {
      const boxes = await JsonToPythonBoxSource.generateBoxes('{"x":1}', {
        pydataclass: true,
      });
      expect(boxes[0].props.plaintextOutput).toContain(
        'from dataclasses import dataclass',
      );
    });

    it('should use CodeBoxTemplate with python language option', async () => {
      const boxes = await JsonToPythonBoxSource.generateBoxes('{"x":1}', {
        pydataclass: true,
      });
      expect(boxes[0].props.options?.language).toBe('python');
    });
  });
});
