import { describe, expect, it } from 'vitest';

import { JsonToTypescriptBoxSource } from '../JsonToTypescriptBoxSource';

describe('JsonToTypescriptBoxSource', () => {
  describe('generateBoxes', () => {
    it('should return [] when no matching option is provided', async () => {
      const boxes = await JsonToTypescriptBoxSource.generateBoxes(
        '{"id":1}',
        null,
      );
      expect(boxes).toHaveLength(0);
    });

    it('should return [] when unrelated options are provided', async () => {
      const boxes = await JsonToTypescriptBoxSource.generateBoxes('{"id":1}', {
        json: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('should generate a Root interface with primitive fields via ::tsinterface', async () => {
      const boxes = await JsonToTypescriptBoxSource.generateBoxes(
        '{"id":1,"name":"Bob"}',
        { tsinterface: true },
      );
      expect(boxes).toHaveLength(1);
      const output = boxes[0].props.plaintextOutput;
      expect(output).toContain('interface Root {');
      expect(output).toContain('id: number;');
      expect(output).toContain('name: string;');
    });

    it('should also trigger via ::jsontots option key', async () => {
      const boxes = await JsonToTypescriptBoxSource.generateBoxes(
        '{"active":true}',
        { jsontots: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toContain('interface Root {');
    });

    it('should emit a nested interface for object values', async () => {
      const boxes = await JsonToTypescriptBoxSource.generateBoxes(
        '{"meta":{"ok":true}}',
        { tsinterface: true },
      );
      expect(boxes).toHaveLength(1);
      const output = boxes[0].props.plaintextOutput;
      expect(output).toContain('interface Meta {');
      expect(output).toContain('ok: boolean;');
      expect(output).toContain('meta: Meta;');
    });

    it('should type string arrays correctly', async () => {
      const boxes = await JsonToTypescriptBoxSource.generateBoxes(
        '{"tags":["a","b"]}',
        { tsinterface: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toContain('tags: string[];');
    });

    it('should type empty arrays as unknown[]', async () => {
      const boxes = await JsonToTypescriptBoxSource.generateBoxes('{"xs":[]}', {
        tsinterface: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toContain('xs: unknown[];');
    });

    it('should return an error box for invalid JSON', async () => {
      const boxes = await JsonToTypescriptBoxSource.generateBoxes('{bad}', {
        tsinterface: true,
      });
      expect(boxes).toHaveLength(1);
      const output = boxes[0].props.plaintextOutput;
      expect(output.toLowerCase()).toContain('invalid');
    });

    it('should handle null field values', async () => {
      const boxes = await JsonToTypescriptBoxSource.generateBoxes(
        '{"nothing":null}',
        { tsinterface: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toContain('nothing: null;');
    });

    it('should quote keys that are not valid identifiers', async () => {
      const boxes = await JsonToTypescriptBoxSource.generateBoxes(
        '{"my-key":1}',
        { tsinterface: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toContain("'my-key': number;");
    });
  });
});
