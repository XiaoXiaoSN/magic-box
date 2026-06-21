import { describe, expect, it } from 'vitest';

import { JsonCsvBoxSource } from '../JsonCsvBoxSource';

describe('JsonCsvBoxSource', () => {
  describe('generateBoxes', () => {
    it('returns [] when no option is provided', async () => {
      const boxes = await JsonCsvBoxSource.generateBoxes('[{"a":1}]', null);
      expect(boxes).toEqual([]);
    });

    it('returns [] when an unrelated option is provided', async () => {
      const boxes = await JsonCsvBoxSource.generateBoxes('[{"a":1}]', {
        yaml: true,
      });
      expect(boxes).toEqual([]);
    });

    it('converts JSON array to CSV', async () => {
      const boxes = await JsonCsvBoxSource.generateBoxes(
        '[{"a":1,"b":2},{"a":3,"b":4}]',
        { jsoncsv: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('JSON → CSV');
      expect(boxes[0].props.plaintextOutput).toBe('a,b\n1,2\n3,4');
    });

    it('CSV-quotes fields containing commas', async () => {
      const boxes = await JsonCsvBoxSource.generateBoxes(
        '[{"name":"a,b","x":1}]',
        { jsoncsv: true },
      );
      expect(boxes[0].props.plaintextOutput).toBe('name,x\n"a,b",1');
    });

    it('produces union of keys across rows, missing values become empty', async () => {
      const boxes = await JsonCsvBoxSource.generateBoxes('[{"a":1},{"b":2}]', {
        jsoncsv: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('a,b\n1,\n,2');
    });

    it('converts CSV to JSON array (::jsoncsv direction auto-detect)', async () => {
      const boxes = await JsonCsvBoxSource.generateBoxes('a,b\n1,2\n3,4', {
        jsoncsv: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('CSV → JSON');
      const parsed = JSON.parse(boxes[0].props.plaintextOutput);
      expect(parsed).toEqual([
        { a: '1', b: '2' },
        { a: '3', b: '4' },
      ]);
    });

    it('converts CSV to JSON array (::csvjson option)', async () => {
      const boxes = await JsonCsvBoxSource.generateBoxes('a,b\n1,2\n3,4', {
        csvjson: true,
      });
      expect(boxes[0].props.name).toBe('CSV → JSON');
      const parsed = JSON.parse(boxes[0].props.plaintextOutput);
      expect(parsed).toEqual([
        { a: '1', b: '2' },
        { a: '3', b: '4' },
      ]);
    });

    it('handles quoted CSV fields with embedded commas', async () => {
      const boxes = await JsonCsvBoxSource.generateBoxes('name,x\n"a,b",1', {
        jsoncsv: true,
      });
      const parsed = JSON.parse(boxes[0].props.plaintextOutput);
      expect(parsed).toEqual([{ name: 'a,b', x: '1' }]);
    });

    it('handles quoted CSV fields with escaped double-quotes', async () => {
      const boxes = await JsonCsvBoxSource.generateBoxes('val\n"say ""hi"""', {
        jsoncsv: true,
      });
      const parsed = JSON.parse(boxes[0].props.plaintextOutput);
      expect(parsed).toEqual([{ val: 'say "hi"' }]);
    });

    it('skips forbidden prototype-pollution keys in CSV headers', async () => {
      const csv = '__proto__,name\nbad,Alice';
      const boxes = await JsonCsvBoxSource.generateBoxes(csv, {
        jsoncsv: true,
      });
      const parsed = JSON.parse(boxes[0].props.plaintextOutput);
      // __proto__ key must be absent; name key must be present
      expect(parsed[0]).not.toHaveProperty('__proto__');
      expect(parsed[0].name).toBe('Alice');
      // object prototype must be unpolluted
      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    });

    it('returns an error box for invalid JSON-looking input', async () => {
      const boxes = await JsonCsvBoxSource.generateBoxes('[bad', {
        jsoncsv: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('JSON / CSV Error');
      // error box uses CodeBoxTemplate; message is in plaintextOutput
      expect(boxes[0].props.plaintextOutput.length).toBeGreaterThan(0);
    });

    it('converts a single JSON object (not array) as a one-row CSV', async () => {
      const boxes = await JsonCsvBoxSource.generateBoxes('{"a":1,"b":2}', {
        jsoncsv: true,
      });
      expect(boxes[0].props.plaintextOutput).toBe('a,b\n1,2');
    });
  });
});
