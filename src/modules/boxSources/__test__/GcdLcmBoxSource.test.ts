import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { GcdLcmBoxSource } from '../GcdLcmBoxSource';

describe('GcdLcmBoxSource', () => {
  describe('option gating', () => {
    it('returns empty array when no option is provided', async () => {
      const boxes = await GcdLcmBoxSource.generateBoxes('12 18 24', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty options object', async () => {
      const boxes = await GcdLcmBoxSource.generateBoxes('12 18 24', {});
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for unrelated option', async () => {
      const boxes = await GcdLcmBoxSource.generateBoxes('12 18 24', {
        base64: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('::gcd option', () => {
    it('computes GCD=6 and LCM=72 for 12 18 24', async () => {
      const boxes = await GcdLcmBoxSource.generateBoxes('12 18 24', {
        gcd: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('GCD / LCM');
      expect(boxes[0].props.options).toMatchObject({
        Numbers: '12, 18, 24',
        GCD: '6',
        LCM: '72',
      });
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
    });
  });

  describe('::lcm option', () => {
    it('accepts ::lcm trigger', async () => {
      const boxes = await GcdLcmBoxSource.generateBoxes('12 18', {
        lcm: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({ GCD: '6', LCM: '36' });
    });
  });

  describe('::gcdlcm option', () => {
    it('accepts ::gcdlcm trigger', async () => {
      const boxes = await GcdLcmBoxSource.generateBoxes('4 6', {
        gcdlcm: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({ GCD: '2', LCM: '12' });
    });
  });

  describe('comma-separated input', () => {
    it('parses "8, 12" and returns GCD=4, LCM=24', async () => {
      const boxes = await GcdLcmBoxSource.generateBoxes('8, 12', {
        gcd: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({
        Numbers: '8, 12',
        GCD: '4',
        LCM: '24',
      });
    });
  });

  describe('negative numbers', () => {
    it('handles "-4 6" — GCD=2, LCM=12', async () => {
      const boxes = await GcdLcmBoxSource.generateBoxes('-4 6', { gcd: true });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({ GCD: '2', LCM: '12' });
    });
  });

  describe('insufficient input', () => {
    it('returns empty array for a single number', async () => {
      const boxes = await GcdLcmBoxSource.generateBoxes('5', { gcd: true });
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty string', async () => {
      const boxes = await GcdLcmBoxSource.generateBoxes('', { gcd: true });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('non-numeric input', () => {
    it('returns empty array for alphabetic tokens', async () => {
      const boxes = await GcdLcmBoxSource.generateBoxes('a b', { gcd: true });
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for mixed numeric and alphabetic tokens', async () => {
      const boxes = await GcdLcmBoxSource.generateBoxes('12 abc', {
        gcd: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('large values (BigInt exactness)', () => {
    it('computes exact GCD and LCM for 1000000000000 and 999999999999', async () => {
      const boxes = await GcdLcmBoxSource.generateBoxes(
        '1000000000000 999999999999',
        { gcd: true },
      );
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      // gcd(1000000000000, 999999999999) = 1 (consecutive integers are coprime)
      expect(opts.GCD).toBe('1');
      // lcm = product when gcd=1
      expect(opts.LCM).toBe('999999999999000000000000');
    });
  });

  describe('zero in input', () => {
    it('reports LCM as 0 when a zero appears', async () => {
      const boxes = await GcdLcmBoxSource.generateBoxes('0 6', { gcd: true });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({ LCM: '0' });
    });
  });

  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(GcdLcmBoxSource.name).toBe('GCD / LCM');
      expect(GcdLcmBoxSource.tag).toBe('#');
      expect(GcdLcmBoxSource.kind).toBe('Math');
      expect(typeof GcdLcmBoxSource.priority).toBe('number');
    });

    it('uses priority on the generated box', async () => {
      const boxes = await GcdLcmBoxSource.generateBoxes('4 6', { gcd: true });
      expect(boxes[0].props.priority).toBe(GcdLcmBoxSource.priority);
    });
  });
});
