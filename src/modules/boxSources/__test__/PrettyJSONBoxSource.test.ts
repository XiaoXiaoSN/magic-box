import { CodeBoxTemplate } from '@components/BoxTemplate';
import { expect } from '@jest/globals';

import { PrettyJSONBoxSource } from '../PrettyJSONBoxSource';

describe('PrettyJSONBoxSource', () => {
  describe('checkMatch', () => {
    it('should return undefined for empty input', () => {
      expect(PrettyJSONBoxSource.checkMatch('')).toBeUndefined();
    });

    it('should return undefined for invalid JSON', () => {
      expect(PrettyJSONBoxSource.checkMatch('not json')).toBeUndefined();
      expect(PrettyJSONBoxSource.checkMatch('{invalid:json}')).toBeUndefined();
    });

    it('should return undefined for already formatted JSON', () => {
      const formattedJson = `{
    "name": "test",
    "value": 123
}`;
      expect(PrettyJSONBoxSource.checkMatch(formattedJson)).toBeUndefined();
    });

    it('should format valid JSON object', () => {
      const input = '{"name":"test","value":123}';
      const result = PrettyJSONBoxSource.checkMatch(input);
      expect(result).toBeDefined();
      expect(result?.jsonStr).toBe(`{
    "name": "test",
    "value": 123
}`);
      expect(result?.options).toEqual({ language: 'json' });
    });

    it('should format valid JSON array', () => {
      const input = '[1,2,3,{"name":"test"}]';
      const result = PrettyJSONBoxSource.checkMatch(input);
      expect(result).toBeDefined();
      expect(result?.jsonStr).toBe(`[
    1,
    2,
    3,
    {
        "name": "test"
    }
]`);
    });
  });

  describe('generateBoxes', () => {
    it('should return empty array for invalid JSON', async () => {
      const boxes = await PrettyJSONBoxSource.generateBoxes('invalid json');
      expect(boxes).toHaveLength(0);
    });

    it('should generate box for valid JSON', async () => {
      const input = '{"name":"test","nested":{"value":123}}';
      const boxes = await PrettyJSONBoxSource.generateBoxes(input);
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Pretty JSON');
      expect(boxes[0].props.priority).toBe(10);
      expect(boxes[0].props.options).toEqual({ language: 'json' });

      const expectedOutput = `{
    "name": "test",
    "nested": {
        "value": 123
    }
}`;
      expect(boxes[0].props.plaintextOutput).toBe(expectedOutput);
      expect(boxes[0].component).toBe(CodeBoxTemplate);
    });
  });
});
