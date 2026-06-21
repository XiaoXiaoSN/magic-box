import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { CombinationsBoxSource } from '../CombinationsBoxSource';

describe('CombinationsBoxSource', () => {
  describe('option gate', () => {
    it('returns [] when no options are provided', async () => {
      const boxes = await CombinationsBoxSource.generateBoxes('52 5', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when no matching option key is present', async () => {
      const boxes = await CombinationsBoxSource.generateBoxes('52 5', {
        other: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('accepts ::ncr option', async () => {
      const boxes = await CombinationsBoxSource.generateBoxes('52 5', {
        ncr: true,
      });
      expect(boxes).toHaveLength(1);
    });

    it('accepts ::npr option', async () => {
      const boxes = await CombinationsBoxSource.generateBoxes('52 5', {
        npr: true,
      });
      expect(boxes).toHaveLength(1);
    });

    it('accepts ::choose option', async () => {
      const boxes = await CombinationsBoxSource.generateBoxes('52 5', {
        choose: true,
      });
      expect(boxes).toHaveLength(1);
    });
  });

  describe('poker hands — C(52, 5) and P(52, 5)', () => {
    it('computes C(52,5) = 2598960 and P(52,5) = 311875200', async () => {
      const boxes = await CombinationsBoxSource.generateBoxes('52 5', {
        ncr: true,
      });
      expect(boxes).toHaveLength(1);

      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv.n).toBe('52');
      expect(kv.r).toBe('5');
      expect(kv['C(n, r)']).toBe('2598960');
      expect(kv['P(n, r)']).toBe('311875200');
    });

    it('uses KeyValueBoxTemplate', async () => {
      const boxes = await CombinationsBoxSource.generateBoxes('52 5', {
        ncr: true,
      });
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
    });

    it('sets priority to 10', async () => {
      const boxes = await CombinationsBoxSource.generateBoxes('52 5', {
        ncr: true,
      });
      expect(boxes[0].props.priority).toBe(10);
    });
  });

  describe('edge cases r = 0 and r = n', () => {
    it('C(5,0) = 1 and P(5,0) = 1', async () => {
      const boxes = await CombinationsBoxSource.generateBoxes('5 0', {
        ncr: true,
      });
      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv['C(n, r)']).toBe('1');
      expect(kv['P(n, r)']).toBe('1');
    });

    it('C(5,5) = 1 and P(5,5) = 120', async () => {
      const boxes = await CombinationsBoxSource.generateBoxes('5 5', {
        ncr: true,
      });
      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv['C(n, r)']).toBe('1');
      expect(kv['P(n, r)']).toBe('120');
    });
  });

  describe('C(10,3) and P(10,3)', () => {
    it('C(10,3) = 120 and P(10,3) = 720', async () => {
      const boxes = await CombinationsBoxSource.generateBoxes('10 3', {
        ncr: true,
      });
      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv['C(n, r)']).toBe('120');
      expect(kv['P(n, r)']).toBe('720');
    });
  });

  describe('large input — C(1000, 500)', () => {
    it('returns an exact BigInt result with no precision loss (>200 digits)', async () => {
      const boxes = await CombinationsBoxSource.generateBoxes('1000 500', {
        ncr: true,
      });
      expect(boxes).toHaveLength(1);
      const kv = boxes[0].props.options as Record<string, string>;
      const c = kv['C(n, r)'];
      // C(1000,500) has ~299 decimal digits — verify no floating-point rounding occurred
      expect(c.length).toBeGreaterThan(200);
      // must be all digits — no 'e' notation which would indicate float fallback
      expect(c).toMatch(/^\d+$/);
    });
  });

  describe('constraint violations', () => {
    it('r > n returns an error box mentioning r ≤ n', async () => {
      const boxes = await CombinationsBoxSource.generateBoxes('3 5', {
        ncr: true,
      });
      expect(boxes).toHaveLength(1);
      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv.Error).toBeTruthy();
      // error must reference the constraint
      expect(kv.Constraints).toContain('r ≤ n');
    });

    it('invalid input "a b" returns an error box', async () => {
      const boxes = await CombinationsBoxSource.generateBoxes('a b', {
        ncr: true,
      });
      expect(boxes).toHaveLength(1);
      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv.Error).toBeTruthy();
    });

    it('n > MAX_N returns an error box', async () => {
      const boxes = await CombinationsBoxSource.generateBoxes('2000000 1', {
        ncr: true,
      });
      expect(boxes).toHaveLength(1);
      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv.Error).toBeTruthy();
      expect(kv.Constraints).toContain('1000000');
    });
  });

  describe('comma-separated input', () => {
    it('accepts "52,5" with comma separator', async () => {
      const boxes = await CombinationsBoxSource.generateBoxes('52,5', {
        ncr: true,
      });
      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv['C(n, r)']).toBe('2598960');
    });
  });
});
