import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { PrimeCheckBoxSource } from '../PrimeCheckBoxSource';

describe('PrimeCheckBoxSource', () => {
  describe('generateBoxes - trigger guard', () => {
    it('returns empty array when no option is provided', async () => {
      const boxes = await PrimeCheckBoxSource.generateBoxes('97', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array when unrelated option is provided', async () => {
      const boxes = await PrimeCheckBoxSource.generateBoxes('97', {
        hash: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('triggers on ::isprime option', async () => {
      const boxes = await PrimeCheckBoxSource.generateBoxes('97', {
        isprime: true,
      });
      expect(boxes).toHaveLength(1);
    });

    it('triggers on ::prime option', async () => {
      const boxes = await PrimeCheckBoxSource.generateBoxes('97', {
        prime: true,
      });
      expect(boxes).toHaveLength(1);
    });
  });

  describe('generateBoxes - known prime 97', () => {
    it('correctly identifies 97 as prime with next=101 and prev=89', async () => {
      // verified: 97 is prime, next prime is 101, previous prime is 89
      const boxes = await PrimeCheckBoxSource.generateBoxes('97', {
        isprime: true,
      });
      expect(boxes).toHaveLength(1);

      const { options } = boxes[0].props;
      expect(options?.['Is Prime']).toBe('true');
      expect(options?.['Next Prime']).toBe('101');
      expect(options?.['Previous Prime']).toBe('89');
      expect(options?.['Smallest Factor']).toBeUndefined();
    });

    it('uses KeyValueBoxTemplate', async () => {
      const boxes = await PrimeCheckBoxSource.generateBoxes('97', {
        isprime: true,
      });
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
    });

    it('sets correct priority', async () => {
      const boxes = await PrimeCheckBoxSource.generateBoxes('97', {
        isprime: true,
      });
      expect(boxes[0].props.priority).toBe(10);
    });
  });

  describe('generateBoxes - composite 100', () => {
    it('correctly identifies 100 as composite with factor 2, next=101, prev=97', async () => {
      const boxes = await PrimeCheckBoxSource.generateBoxes('100', {
        isprime: true,
      });
      expect(boxes).toHaveLength(1);

      const { options } = boxes[0].props;
      expect(options?.['Is Prime']).toBe('false');
      expect(options?.['Next Prime']).toBe('101');
      expect(options?.['Previous Prime']).toBe('97');
      expect(options?.['Smallest Factor']).toBe('2');
    });
  });

  describe('generateBoxes - boundary: 2', () => {
    it('correctly identifies 2 as prime with prev=none and next=3', async () => {
      const boxes = await PrimeCheckBoxSource.generateBoxes('2', {
        isprime: true,
      });
      expect(boxes).toHaveLength(1);

      const { options } = boxes[0].props;
      expect(options?.['Is Prime']).toBe('true');
      expect(options?.['Previous Prime']).toBe('none');
      expect(options?.['Next Prime']).toBe('3');
    });
  });

  describe('generateBoxes - boundary: 1', () => {
    it('correctly identifies 1 as not prime and next prime is 2', async () => {
      const boxes = await PrimeCheckBoxSource.generateBoxes('1', {
        isprime: true,
      });
      expect(boxes).toHaveLength(1);

      const { options } = boxes[0].props;
      expect(options?.['Is Prime']).toBe('false');
      expect(options?.['Next Prime']).toBe('2');
      // 1 < 2, so no previous prime
      expect(options?.['Previous Prime']).toBe('none');
    });
  });

  describe('generateBoxes - Carmichael number 561', () => {
    it('correctly identifies 561 as composite via trial division (not fooled like Fermat)', async () => {
      // 561 = 3 × 11 × 17; a Carmichael number — Fermat primality would wrongly pass it
      const boxes = await PrimeCheckBoxSource.generateBoxes('561', {
        isprime: true,
      });
      expect(boxes).toHaveLength(1);

      const { options } = boxes[0].props;
      expect(options?.['Is Prime']).toBe('false');
      expect(options?.['Smallest Factor']).toBe('3');
    });
  });

  describe('generateBoxes - large prime 1000000007', () => {
    it('correctly identifies 10^9+7 as prime', async () => {
      // 1000000007 is the famous prime used in competitive programming
      const boxes = await PrimeCheckBoxSource.generateBoxes('1000000007', {
        isprime: true,
      });
      expect(boxes).toHaveLength(1);

      const { options } = boxes[0].props;
      expect(options?.['Is Prime']).toBe('true');
      expect(options?.Number).toBe('1000000007');
    });
  });

  describe('generateBoxes - out-of-range input', () => {
    it('returns an error box for value exceeding 10^13', async () => {
      // 100000000000000 = 10^14, which exceeds MAX_VALUE
      const boxes = await PrimeCheckBoxSource.generateBoxes('100000000000000', {
        isprime: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.Error).toBeDefined();
    });
  });

  describe('generateBoxes - invalid input', () => {
    it('returns an error box for non-numeric input', async () => {
      const boxes = await PrimeCheckBoxSource.generateBoxes('abc', {
        isprime: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.Error).toBeDefined();
    });

    it('returns an error box for negative number string', async () => {
      const boxes = await PrimeCheckBoxSource.generateBoxes('-7', {
        isprime: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.Error).toBeDefined();
    });
  });

  describe('box structure', () => {
    it('box name is "Prime Check"', async () => {
      const boxes = await PrimeCheckBoxSource.generateBoxes('97', {
        isprime: true,
      });
      expect(boxes[0].props.name).toBe('Prime Check');
    });

    it('plaintextOutput contains key: value lines', async () => {
      const boxes = await PrimeCheckBoxSource.generateBoxes('97', {
        isprime: true,
      });
      const text = boxes[0].props.plaintextOutput;
      expect(text).toContain('Is Prime: true');
      expect(text).toContain('Next Prime: 101');
      expect(text).toContain('Previous Prime: 89');
    });
  });
});
