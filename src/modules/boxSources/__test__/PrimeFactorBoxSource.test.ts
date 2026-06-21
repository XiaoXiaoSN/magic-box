import { describe, expect, it } from 'vitest';

import { PrimeFactorBoxSource } from '../PrimeFactorBoxSource';

describe('PrimeFactorBoxSource', () => {
  it('returns [] when no option keys are present', async () => {
    const boxes = await PrimeFactorBoxSource.generateBoxes('360', null);
    expect(boxes).toHaveLength(0);
  });

  it('returns [] when options object has no trigger keys', async () => {
    const boxes = await PrimeFactorBoxSource.generateBoxes('360', {
      unrelated: true,
    });
    expect(boxes).toHaveLength(0);
  });

  describe('360 — composite', () => {
    it('produces correct factorization, prime=false, divisor count 24', async () => {
      const boxes = await PrimeFactorBoxSource.generateBoxes('360', {
        isprime: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Prime).toBe('false');
      expect(opts.Factorization).toBe('2^3 × 3^2 × 5');
      expect(opts['Divisor Count']).toBe('24');
      expect(opts.Number).toBe('360');
    });
  });

  describe('97 — prime', () => {
    it('reports prime=true, factorization is the number itself', async () => {
      const boxes = await PrimeFactorBoxSource.generateBoxes('97', {
        factor: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Prime).toBe('true');
      expect(opts.Factorization).toBe('97');
    });
  });

  describe('2 — smallest prime', () => {
    it('reports prime=true', async () => {
      const boxes = await PrimeFactorBoxSource.generateBoxes('2', {
        isprime: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Prime).toBe('true');
    });
  });

  describe('1 — below range', () => {
    it('returns an error box mentioning valid range', async () => {
      const boxes = await PrimeFactorBoxSource.generateBoxes('1', {
        isprime: true,
      });
      expect(boxes).toHaveLength(1);
      // error box uses the same template; check that options signal the problem
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Valid Range']).toBeDefined();
    });
  });

  describe('999999999989 — large prime < 10^12', () => {
    it('reports prime=true', async () => {
      const boxes = await PrimeFactorBoxSource.generateBoxes('999999999989', {
        primefactors: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Prime).toBe('true');
      expect(opts.Factorization).toBe('999999999989');
    });
  });

  describe('10000000000000 — over range (10^13, 14 digits)', () => {
    it('returns an error box mentioning valid range', async () => {
      const boxes = await PrimeFactorBoxSource.generateBoxes('10000000000000', {
        isprime: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Valid Range']).toBeDefined();
    });
  });

  describe('non-numeric input', () => {
    it('returns an error box explaining integer is required', async () => {
      const boxes = await PrimeFactorBoxSource.generateBoxes('abc', {
        isprime: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Valid Range']).toBeDefined();
    });
  });

  it('triggers on ::factor option key', async () => {
    const boxes = await PrimeFactorBoxSource.generateBoxes('12', {
      factor: true,
    });
    expect(boxes).toHaveLength(1);
  });

  it('triggers on ::primefactors option key', async () => {
    const boxes = await PrimeFactorBoxSource.generateBoxes('12', {
      primefactors: true,
    });
    expect(boxes).toHaveLength(1);
  });
});
