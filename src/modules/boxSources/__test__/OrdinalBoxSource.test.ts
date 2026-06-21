import { describe, expect, it } from 'vitest';

import { OrdinalBoxSource } from '../OrdinalBoxSource';

describe('OrdinalBoxSource', () => {
  describe('gate conditions', () => {
    it('returns empty array when no option is provided', async () => {
      const boxes = await OrdinalBoxSource.generateBoxes('21', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array when options object lacks ordinal key', async () => {
      const boxes = await OrdinalBoxSource.generateBoxes('21', {});
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for non-numeric input', async () => {
      const boxes = await OrdinalBoxSource.generateBoxes('abc', {
        ordinal: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for input exceeding 16 digits', async () => {
      const boxes = await OrdinalBoxSource.generateBoxes('12345678901234567', {
        ordinal: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('ordinal output', () => {
    it('converts 21 to 21st', async () => {
      const boxes = await OrdinalBoxSource.generateBoxes('21', {
        ordinal: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.Ordinal).toBe('21st');
      expect(boxes[0].props.options?.Suffix).toBe('st');
    });

    it('converts 1 to 1st', async () => {
      const boxes = await OrdinalBoxSource.generateBoxes('1', {
        ordinal: true,
      });
      expect(boxes[0].props.options?.Ordinal).toBe('1st');
      expect(boxes[0].props.options?.Suffix).toBe('st');
    });

    it('converts 2 to 2nd', async () => {
      const boxes = await OrdinalBoxSource.generateBoxes('2', {
        ordinal: true,
      });
      expect(boxes[0].props.options?.Ordinal).toBe('2nd');
      expect(boxes[0].props.options?.Suffix).toBe('nd');
    });

    it('converts 3 to 3rd', async () => {
      const boxes = await OrdinalBoxSource.generateBoxes('3', {
        ordinal: true,
      });
      expect(boxes[0].props.options?.Ordinal).toBe('3rd');
      expect(boxes[0].props.options?.Suffix).toBe('rd');
    });

    it('converts 4 to 4th', async () => {
      const boxes = await OrdinalBoxSource.generateBoxes('4', {
        ordinal: true,
      });
      expect(boxes[0].props.options?.Ordinal).toBe('4th');
      expect(boxes[0].props.options?.Suffix).toBe('th');
    });

    it('converts 0 to 0th', async () => {
      const boxes = await OrdinalBoxSource.generateBoxes('0', {
        ordinal: true,
      });
      expect(boxes[0].props.options?.Ordinal).toBe('0th');
      expect(boxes[0].props.options?.Suffix).toBe('th');
    });
  });

  describe('teen exceptions (11–13 always use th)', () => {
    it('converts 11 to 11th', async () => {
      const boxes = await OrdinalBoxSource.generateBoxes('11', {
        ordinal: true,
      });
      expect(boxes[0].props.options?.Ordinal).toBe('11th');
      expect(boxes[0].props.options?.Suffix).toBe('th');
    });

    it('converts 12 to 12th', async () => {
      const boxes = await OrdinalBoxSource.generateBoxes('12', {
        ordinal: true,
      });
      expect(boxes[0].props.options?.Ordinal).toBe('12th');
      expect(boxes[0].props.options?.Suffix).toBe('th');
    });

    it('converts 13 to 13th', async () => {
      const boxes = await OrdinalBoxSource.generateBoxes('13', {
        ordinal: true,
      });
      expect(boxes[0].props.options?.Ordinal).toBe('13th');
      expect(boxes[0].props.options?.Suffix).toBe('th');
    });

    it('converts 111 to 111th (last two digits 11)', async () => {
      const boxes = await OrdinalBoxSource.generateBoxes('111', {
        ordinal: true,
      });
      expect(boxes[0].props.options?.Ordinal).toBe('111th');
      expect(boxes[0].props.options?.Suffix).toBe('th');
    });

    it('converts 101 to 101st (last two digits 01, not a teen)', async () => {
      const boxes = await OrdinalBoxSource.generateBoxes('101', {
        ordinal: true,
      });
      expect(boxes[0].props.options?.Ordinal).toBe('101st');
      expect(boxes[0].props.options?.Suffix).toBe('st');
    });

    it('converts 22 to 22nd', async () => {
      const boxes = await OrdinalBoxSource.generateBoxes('22', {
        ordinal: true,
      });
      expect(boxes[0].props.options?.Ordinal).toBe('22nd');
      expect(boxes[0].props.options?.Suffix).toBe('nd');
    });
  });

  describe('box structure', () => {
    it('returns exactly one box', async () => {
      const boxes = await OrdinalBoxSource.generateBoxes('21', {
        ordinal: true,
      });
      expect(boxes).toHaveLength(1);
    });

    it('box name is Ordinal', async () => {
      const boxes = await OrdinalBoxSource.generateBoxes('21', {
        ordinal: true,
      });
      expect(boxes[0].props.name).toBe('Ordinal');
    });

    it('box priority matches source priority', async () => {
      const boxes = await OrdinalBoxSource.generateBoxes('21', {
        ordinal: true,
      });
      expect(boxes[0].props.priority).toBe(OrdinalBoxSource.priority);
    });

    it('rejects 16-digit input beyond MAX_SAFE_INTEGER (float would round)', async () => {
      const boxes = await OrdinalBoxSource.generateBoxes('9999999999999991', {
        ordinal: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });
});
