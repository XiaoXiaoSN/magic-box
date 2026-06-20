import { CsvJsonBoxSource } from '@modules/boxSources/CsvJsonBoxSource';
import { describe, expect, it } from 'vitest';

describe('CsvJsonBoxSource', () => {
  describe('generateBoxes', () => {
    it('returns [] when ::csv option is absent', async () => {
      const boxes = await CsvJsonBoxSource.generateBoxes(
        'name,age\nAlice,30',
        null,
      );
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when ::csv option is absent (empty options)', async () => {
      const boxes = await CsvJsonBoxSource.generateBoxes(
        'name,age\nAlice,30',
        {},
      );
      expect(boxes).toHaveLength(0);
    });

    it('converts CSV → JSON array of objects (values stay strings)', async () => {
      const boxes = await CsvJsonBoxSource.generateBoxes(
        'name,age\nAlice,30\nBob,25',
        {
          csv: true,
        },
      );

      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('CSV → JSON');

      const parsed = JSON.parse(boxes[0].props.plaintextOutput);
      expect(parsed).toEqual([
        { name: 'Alice', age: '30' },
        { name: 'Bob', age: '25' },
      ]);
    });

    it('handles quoted fields with embedded commas and escaped quotes', async () => {
      const input = 'name,note\n"Smith, Jr.","said ""hi"""';
      const boxes = await CsvJsonBoxSource.generateBoxes(input, { csv: true });

      expect(boxes).toHaveLength(1);
      const parsed = JSON.parse(boxes[0].props.plaintextOutput);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].name).toBe('Smith, Jr.');
      expect(parsed[0].note).toBe('said "hi"');
    });

    it('converts JSON array → CSV with correct header and data rows', async () => {
      const input = '[{"a":1,"b":2},{"a":3,"b":4}]';
      const boxes = await CsvJsonBoxSource.generateBoxes(input, { csv: true });

      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('JSON → CSV');

      const lines = boxes[0].props.plaintextOutput.split('\n');
      expect(lines[0]).toBe('a,b');
      expect(lines[1]).toBe('1,2');
      expect(lines[2]).toBe('3,4');
    });

    it('quotes CSV fields that contain commas', async () => {
      const input = '[{"val":"x,y"}]';
      const boxes = await CsvJsonBoxSource.generateBoxes(input, { csv: true });

      expect(boxes).toHaveLength(1);
      const lines = boxes[0].props.plaintextOutput.split('\n');
      // header row
      expect(lines[0]).toBe('val');
      // value must be quoted because it contains a comma
      expect(lines[1]).toBe('"x,y"');
    });

    it('returns [] when input exceeds MAX_INPUT', async () => {
      const huge = `${'a,b\n1,2\n'.repeat(20_000)}`;
      const boxes = await CsvJsonBoxSource.generateBoxes(huge, { csv: true });
      expect(boxes).toHaveLength(0);
    });

    it('returns an error box on malformed JSON input', async () => {
      const boxes = await CsvJsonBoxSource.generateBoxes('[{invalid}]', {
        csv: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('JSON → CSV');
      expect(boxes[0].props.plaintextOutput).toMatch(/error/i);
    });

    it('keeps a newline embedded in a quoted CSV field as one row', async () => {
      const input = 'name,note\n"a\nb",x';
      const boxes = await CsvJsonBoxSource.generateBoxes(input, { csv: true });
      const parsed = JSON.parse(boxes[0].props.plaintextOutput);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].name).toBe('a\nb');
      expect(parsed[0].note).toBe('x');
    });

    it('unions heterogeneous keys (first-seen order, missing → empty)', async () => {
      const boxes = await CsvJsonBoxSource.generateBoxes('[{"a":1},{"b":2}]', {
        csv: true,
      });
      const lines = boxes[0].props.plaintextOutput.split('\n');
      expect(lines[0]).toBe('a,b');
      expect(lines[1]).toBe('1,');
      expect(lines[2]).toBe(',2');
    });
  });
});
