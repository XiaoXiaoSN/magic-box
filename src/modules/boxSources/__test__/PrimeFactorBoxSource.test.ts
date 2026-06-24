import { describe, expect, it } from 'vitest';

import { PrimeFactorBoxSource } from '../PrimeFactorBoxSource';

describe('PrimeFactorBoxSource', () => {
  describe('option gating', () => {
    it('returns [] when no option is provided', async () => {
      const boxes = await PrimeFactorBoxSource.generateBoxes('360', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when an unrelated option is provided', async () => {
      const boxes = await PrimeFactorBoxSource.generateBoxes('360', {
        hash: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('::factor trigger', () => {
    it('360 = 2^3 × 3^2 × 5', async () => {
      const boxes = await PrimeFactorBoxSource.generateBoxes('360', {
        factor: true,
      });
      expect(boxes).toHaveLength(1);
      const { options } = boxes[0].props;
      expect(options?.Factorization).toBe('2^3 × 3^2 × 5');
      expect(options?.['Prime Factors']).toBe('2, 3, 5');
      expect(options?.['Is Prime']).toBe('false');
      expect(options?.Number).toBe('360');
    });

    it('17 is prime', async () => {
      const boxes = await PrimeFactorBoxSource.generateBoxes('17', {
        factor: true,
      });
      expect(boxes).toHaveLength(1);
      const { options } = boxes[0].props;
      expect(options?.Factorization).toBe('17');
      expect(options?.['Is Prime']).toBe('true');
    });

    it('12 = 2^2 × 3', async () => {
      const boxes = await PrimeFactorBoxSource.generateBoxes('12', {
        factor: true,
      });
      expect(boxes).toHaveLength(1);
      const { options } = boxes[0].props;
      expect(options?.Factorization).toBe('2^2 × 3');
    });

    it('1024 = 2^10', async () => {
      const boxes = await PrimeFactorBoxSource.generateBoxes('1024', {
        factor: true,
      });
      expect(boxes).toHaveLength(1);
      const { options } = boxes[0].props;
      expect(options?.Factorization).toBe('2^10');
      expect(options?.['Is Prime']).toBe('false');
    });
  });

  describe('::factorize and ::primefactor triggers', () => {
    it('accepts ::factorize', async () => {
      const boxes = await PrimeFactorBoxSource.generateBoxes('7', {
        factorize: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.['Is Prime']).toBe('true');
    });

    it('accepts ::primefactor', async () => {
      const boxes = await PrimeFactorBoxSource.generateBoxes('6', {
        primefactor: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.Factorization).toBe('2 × 3');
    });
  });

  describe('boundary and error cases', () => {
    it('1 is out of range → explanatory box', async () => {
      const boxes = await PrimeFactorBoxSource.generateBoxes('1', {
        factor: true,
      });
      expect(boxes).toHaveLength(1);
      const note = boxes[0].props.options?.Note as string;
      expect(note).toMatch(/between 2 and/i);
    });

    it('too large (10^13) → explanatory box', async () => {
      const boxes = await PrimeFactorBoxSource.generateBoxes('10000000000000', {
        factor: true,
      });
      expect(boxes).toHaveLength(1);
      const note = boxes[0].props.options?.Note as string;
      expect(note).toMatch(/too large/i);
    });

    it('invalid "abc" → explanatory box', async () => {
      const boxes = await PrimeFactorBoxSource.generateBoxes('abc', {
        factor: true,
      });
      expect(boxes).toHaveLength(1);
      const note = boxes[0].props.options?.Note as string;
      expect(note).toMatch(/positive integer/i);
    });

    it('large prime near cap (999999999989) is prime', async () => {
      // 999999999989 is a known prime < 10^12; sqrt ≈ 999999 — stays within budget
      const boxes = await PrimeFactorBoxSource.generateBoxes('999999999989', {
        factor: true,
      });
      expect(boxes).toHaveLength(1);
      const { options } = boxes[0].props;
      expect(options?.['Is Prime']).toBe('true');
      expect(options?.Factorization).toBe('999999999989');
    }, 10_000); // allow up to 10 s for the trial division
  });

  describe('box shape', () => {
    it('box name is "Prime Factorization"', async () => {
      const boxes = await PrimeFactorBoxSource.generateBoxes('360', {
        factor: true,
      });
      expect(boxes[0].props.name).toBe('Prime Factorization');
    });

    it('priority equals source priority', async () => {
      const boxes = await PrimeFactorBoxSource.generateBoxes('360', {
        factor: true,
      });
      expect(boxes[0].props.priority).toBe(PrimeFactorBoxSource.priority);
    });

    it('plaintextOutput is non-empty k:v text (no JSON, no empty string)', async () => {
      const boxes = await PrimeFactorBoxSource.generateBoxes('360', {
        factor: true,
      });
      const text = boxes[0].props.plaintextOutput;
      expect(text).toBeTruthy();
      expect(text).not.toBe('');
      // should contain at least one "key: value" pair
      expect(text).toMatch(/\w+: .+/);
      // must not be JSON
      expect(() => JSON.parse(text)).toThrow();
    });
  });
});
