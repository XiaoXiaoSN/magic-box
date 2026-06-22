import { describe, expect, it } from 'vitest';

import { DivisorsBoxSource } from '../DivisorsBoxSource';

describe('DivisorsBoxSource', () => {
  describe('option gating', () => {
    it('returns [] when no option is provided', async () => {
      const boxes = await DivisorsBoxSource.generateBoxes('28', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for an unrelated option', async () => {
      const boxes = await DivisorsBoxSource.generateBoxes('28', {
        qrcode: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('does not trigger on ::factors (that means prime factorization)', async () => {
      const boxes = await DivisorsBoxSource.generateBoxes('6', {
        factors: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('28 — perfect number', () => {
    it('lists all divisors of 28', async () => {
      const boxes = await DivisorsBoxSource.generateBoxes('28', {
        divisors: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Divisors).toBe('1, 2, 4, 7, 14, 28');
    });

    it('count is 6 for 28', async () => {
      const boxes = await DivisorsBoxSource.generateBoxes('28', {
        divisors: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Count).toBe('6');
    });

    it('sigma(28) = 56', async () => {
      const boxes = await DivisorsBoxSource.generateBoxes('28', {
        divisors: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Sum).toBe('56');
    });

    it('28 is classified as perfect', async () => {
      const boxes = await DivisorsBoxSource.generateBoxes('28', {
        divisors: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Classification).toBe('perfect');
    });

    it('box name is Divisors', async () => {
      const boxes = await DivisorsBoxSource.generateBoxes('28', {
        divisors: true,
      });
      expect(boxes[0].props.name).toBe('Divisors');
    });

    it('priority matches source priority', async () => {
      const boxes = await DivisorsBoxSource.generateBoxes('28', {
        divisors: true,
      });
      expect(boxes[0].props.priority).toBe(DivisorsBoxSource.priority);
    });
  });

  describe('12 — abundant number', () => {
    it('divisors of 12', async () => {
      const boxes = await DivisorsBoxSource.generateBoxes('12', {
        divisors: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Divisors).toBe('1, 2, 3, 4, 6, 12');
    });

    it('count is 6 for 12', async () => {
      const boxes = await DivisorsBoxSource.generateBoxes('12', {
        divisors: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Count).toBe('6');
    });

    it('sigma(12) = 28', async () => {
      const boxes = await DivisorsBoxSource.generateBoxes('12', {
        divisors: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      // 1+2+3+4+6+12 = 28
      expect(opts.Sum).toBe('28');
    });

    it('12 is classified as abundant (proper sum 16 > 12)', async () => {
      const boxes = await DivisorsBoxSource.generateBoxes('12', {
        divisors: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Classification).toBe('abundant');
    });
  });

  describe('13 — prime / deficient', () => {
    it('divisors of 13 are 1 and 13', async () => {
      const boxes = await DivisorsBoxSource.generateBoxes('13', {
        divisors: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Divisors).toBe('1, 13');
    });

    it('count is 2 for 13', async () => {
      const boxes = await DivisorsBoxSource.generateBoxes('13', {
        divisors: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Count).toBe('2');
    });

    it('13 is classified as deficient (prime)', async () => {
      const boxes = await DivisorsBoxSource.generateBoxes('13', {
        divisors: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Classification).toBe('deficient (prime)');
    });
  });

  describe('1 — edge case', () => {
    it('divisors of 1 is just 1', async () => {
      const boxes = await DivisorsBoxSource.generateBoxes('1', {
        divisors: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Divisors).toBe('1');
      expect(opts.Count).toBe('1');
    });

    it('1 is classified as deficient', async () => {
      const boxes = await DivisorsBoxSource.generateBoxes('1', {
        divisors: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Classification).toBe('deficient');
    });
  });

  describe('6 — perfect number', () => {
    it('6 is perfect (1+2+3=6)', async () => {
      const boxes = await DivisorsBoxSource.generateBoxes('6', {
        divisors: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Classification).toBe('perfect');
      expect(opts.Divisors).toBe('1, 2, 3, 6');
    });
  });

  describe('invalid / out-of-range inputs', () => {
    it('returns an error box for too-large input (10^13)', async () => {
      const boxes = await DivisorsBoxSource.generateBoxes('10000000000000', {
        divisors: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Error).toBeDefined();
    });

    it('returns an error box for "0"', async () => {
      // 0 passes the digit regex but fails the n >= 1 check
      const boxes = await DivisorsBoxSource.generateBoxes('0', {
        divisors: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Error).toBeDefined();
    });

    it('returns an error box for non-numeric input "abc"', async () => {
      const boxes = await DivisorsBoxSource.generateBoxes('abc', {
        divisors: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Error).toBeDefined();
    });

    it('returns an error box for negative-looking input "-5"', async () => {
      const boxes = await DivisorsBoxSource.generateBoxes('-5', {
        divisors: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Error).toBeDefined();
    });
  });

  describe('static metadata', () => {
    it('has correct name, tag, kind', () => {
      expect(DivisorsBoxSource.name).toBe('Divisors');
      expect(DivisorsBoxSource.tag).toBe('#');
      expect(DivisorsBoxSource.kind).toBe('Calculate');
      expect(typeof DivisorsBoxSource.priority).toBe('number');
    });
  });
});
