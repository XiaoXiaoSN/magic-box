import { describe, expect, it } from 'vitest';

import { JsonSortKeysBoxSource } from '../JsonSortKeysBoxSource';

describe('JsonSortKeysBoxSource', () => {
  describe('generateBoxes', () => {
    it('returns [] for empty or whitespace input (no spurious error box)', async () => {
      expect(
        await JsonSortKeysBoxSource.generateBoxes('', { sortkeys: true }),
      ).toHaveLength(0);
      expect(
        await JsonSortKeysBoxSource.generateBoxes('   ', { sortkeys: true }),
      ).toHaveLength(0);
    });

    it('returns empty array when sortkeys option is absent', async () => {
      const boxes = await JsonSortKeysBoxSource.generateBoxes(
        '{"b":1,"a":2}',
        null,
      );
      expect(boxes).toHaveLength(0);

      const boxes2 = await JsonSortKeysBoxSource.generateBoxes(
        '{"b":1,"a":2}',
        {},
      );
      expect(boxes2).toHaveLength(0);

      const boxes3 = await JsonSortKeysBoxSource.generateBoxes(
        '{"b":1,"a":2}',
        { other: true },
      );
      expect(boxes3).toHaveLength(0);
    });

    it('sorts flat object keys alphabetically and matches exact output', async () => {
      const boxes = await JsonSortKeysBoxSource.generateBoxes('{"b":1,"a":2}', {
        sortkeys: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('JSON Sort Keys');
      expect(boxes[0].props.plaintextOutput).toBe('{\n  "a": 2,\n  "b": 1\n}');
      // confirm parsed key order
      const parsed = JSON.parse(boxes[0].props.plaintextOutput);
      expect(Object.keys(parsed)).toEqual(['a', 'b']);
    });

    it('sorts nested object keys recursively', async () => {
      const boxes = await JsonSortKeysBoxSource.generateBoxes(
        '{"b":1,"a":{"d":4,"c":3}}',
        { sortkeys: true },
      );
      expect(boxes).toHaveLength(1);
      const parsed = JSON.parse(boxes[0].props.plaintextOutput);
      expect(Object.keys(parsed)).toEqual(['a', 'b']);
      expect(Object.keys(parsed.a)).toEqual(['c', 'd']);
    });

    it('preserves array element order while sorting keys within each element', async () => {
      const boxes = await JsonSortKeysBoxSource.generateBoxes(
        '[{"b":1,"a":2},{"z":3,"m":4}]',
        { sortkeys: true },
      );
      expect(boxes).toHaveLength(1);
      const parsed = JSON.parse(boxes[0].props.plaintextOutput);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
      expect(Object.keys(parsed[0])).toEqual(['a', 'b']);
      expect(Object.keys(parsed[1])).toEqual(['m', 'z']);
    });

    it('returns a box mentioning invalid JSON on parse failure', async () => {
      const boxes = await JsonSortKeysBoxSource.generateBoxes('{bad}', {
        sortkeys: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput.toLowerCase()).toContain('invalid');
    });
  });
});
