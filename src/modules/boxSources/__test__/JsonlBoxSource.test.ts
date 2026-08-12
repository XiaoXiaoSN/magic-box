import { describe, expect, it } from 'vitest';

import { JsonlBoxSource } from '../JsonlBoxSource';

describe('JsonlBoxSource', () => {
  describe('generateBoxes', () => {
    it('should return empty array when no option is provided', async () => {
      const boxes = await JsonlBoxSource.generateBoxes('[{"a":1}]', null);
      expect(boxes).toHaveLength(0);
    });

    it('should return empty array when unrelated option is provided', async () => {
      const boxes = await JsonlBoxSource.generateBoxes('[{"a":1}]', {
        yaml: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('should convert JSON array to JSONL (compact, one per line)', async () => {
      const boxes = await JsonlBoxSource.generateBoxes('[{"a":1},{"a":2}]', {
        jsonl: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('{"a":1}\n{"a":2}');
    });

    it('should convert JSON array to JSONL via ::ndjson option', async () => {
      const boxes = await JsonlBoxSource.generateBoxes('[{"a":1},{"a":2}]', {
        ndjson: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('{"a":1}\n{"a":2}');
    });

    it('should convert JSONL to pretty-printed JSON array', async () => {
      const boxes = await JsonlBoxSource.generateBoxes('{"a":1}\n{"a":2}', {
        jsonl: true,
      });
      expect(boxes).toHaveLength(1);
      const parsed = JSON.parse(boxes[0].props.plaintextOutput);
      expect(parsed).toEqual([{ a: 1 }, { a: 2 }]);
    });

    it('should skip blank lines when converting JSONL to array', async () => {
      const boxes = await JsonlBoxSource.generateBoxes('{"a":1}\n\n{"a":2}\n', {
        jsonl: true,
      });
      expect(boxes).toHaveLength(1);
      const parsed = JSON.parse(boxes[0].props.plaintextOutput);
      expect(parsed).toHaveLength(2);
      expect(parsed).toEqual([{ a: 1 }, { a: 2 }]);
    });

    it('should handle scalar values in array → JSONL', async () => {
      const boxes = await JsonlBoxSource.generateBoxes('[1,2,3]', {
        jsonl: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toBe('1\n2\n3');
    });

    it('should handle scalar JSONL → array', async () => {
      const boxes = await JsonlBoxSource.generateBoxes('1\n2\n3', {
        jsonl: true,
      });
      expect(boxes).toHaveLength(1);
      const parsed = JSON.parse(boxes[0].props.plaintextOutput);
      expect(parsed).toEqual([1, 2, 3]);
    });

    it('should return error box for invalid JSON array input', async () => {
      const boxes = await JsonlBoxSource.generateBoxes('[bad', { jsonl: true });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/parse error/i);
    });

    it('should return error box mentioning the failing line number for invalid JSONL', async () => {
      const boxes = await JsonlBoxSource.generateBoxes('{"a":1}\n{bad', {
        jsonl: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/line 2/i);
    });

    it('should preserve data through array → jsonl → array round-trip', async () => {
      const original = [
        { x: 1, y: 'hello' },
        { x: 2, y: 'world' },
      ];
      const input = JSON.stringify(original);

      // array → jsonl
      const jsonlBoxes = await JsonlBoxSource.generateBoxes(input, {
        jsonl: true,
      });
      expect(jsonlBoxes).toHaveLength(1);
      const jsonlOutput = jsonlBoxes[0].props.plaintextOutput;

      // jsonl → array
      const arrayBoxes = await JsonlBoxSource.generateBoxes(jsonlOutput, {
        jsonl: true,
      });
      expect(arrayBoxes).toHaveLength(1);
      const roundTripped = JSON.parse(arrayBoxes[0].props.plaintextOutput);
      expect(roundTripped).toEqual(original);
    });

    it('should use CodeBoxTemplate with language set to json', async () => {
      const boxes = await JsonlBoxSource.generateBoxes('[{"a":1}]', {
        jsonl: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.language).toBe('json');
    });

    it('should set priority on the box', async () => {
      const boxes = await JsonlBoxSource.generateBoxes('[{"a":1}]', {
        jsonl: true,
      });
      expect(boxes[0].props.priority).toBe(JsonlBoxSource.priority);
    });
  });
});
