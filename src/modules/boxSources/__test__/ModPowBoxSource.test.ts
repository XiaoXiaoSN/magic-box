import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { ModPowBoxSource } from '../ModPowBoxSource';

describe('ModPowBoxSource', () => {
  describe('generateBoxes — gating', () => {
    it('returns [] when no matching option is present', async () => {
      const boxes = await ModPowBoxSource.generateBoxes('4 13 497', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when unrelated options are present', async () => {
      const boxes = await ModPowBoxSource.generateBoxes('4 13 497', {
        hash: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes — classic RSA example', () => {
    it('computes 4^13 mod 497 = 445 via ::modpow', async () => {
      const boxes = await ModPowBoxSource.generateBoxes('4 13 497', {
        modpow: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Modular Exponentiation');
      expect(boxes[0].props.priority).toBe(10);
      expect(boxes[0].props.options).toMatchObject({ Result: '445' });
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
    });

    it('computes 4^13 mod 497 = 445 via ::powmod alias', async () => {
      const boxes = await ModPowBoxSource.generateBoxes('4 13 497', {
        powmod: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({ Result: '445' });
    });
  });

  describe('generateBoxes — correctness cases', () => {
    it('computes 2^10 mod 1000 = 24', async () => {
      const boxes = await ModPowBoxSource.generateBoxes('2 10 1000', {
        modpow: true,
      });
      expect(boxes[0].props.options).toMatchObject({ Result: '24' });
    });

    it('computes 3^0 mod 7 = 1 (anything^0 = 1)', async () => {
      const boxes = await ModPowBoxSource.generateBoxes('3 0 7', {
        modpow: true,
      });
      expect(boxes[0].props.options).toMatchObject({ Result: '1' });
    });

    it('computes 5^3 mod 1 = 0 (all values mod 1 = 0)', async () => {
      const boxes = await ModPowBoxSource.generateBoxes('5 3 1', {
        modpow: true,
      });
      expect(boxes[0].props.options).toMatchObject({ Result: '0' });
    });

    it('handles negative base: -2^3 mod 5 = 2', async () => {
      const boxes = await ModPowBoxSource.generateBoxes('-2 3 5', {
        modpow: true,
      });
      // (-8 mod 5) normalised to [0,5) = 2
      expect(boxes[0].props.options).toMatchObject({ Result: '2' });
    });
  });

  describe('generateBoxes — huge exponent (performance)', () => {
    it('computes 2^1000000 mod 1000000007 without hanging', async () => {
      const boxes = await ModPowBoxSource.generateBoxes(
        '2 1000000 1000000007',
        { modpow: true },
      );
      expect(boxes).toHaveLength(1);
      const result = BigInt(
        (boxes[0].props.options as Record<string, string>).Result,
      );
      expect(result).toBeGreaterThanOrEqual(0n);
      expect(result).toBeLessThan(1000000007n);
    });
  });

  describe('generateBoxes — error cases', () => {
    it('returns an error box when fewer than 3 tokens are given', async () => {
      const boxes = await ModPowBoxSource.generateBoxes('4 13', {
        modpow: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({
        Note: expect.stringContaining('3 integers'),
      });
    });

    it('returns an error box when modulus is 0', async () => {
      const boxes = await ModPowBoxSource.generateBoxes('4 13 0', {
        modpow: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({
        Note: expect.stringContaining('Modulus'),
      });
    });

    it('returns an error box when exponent is negative', async () => {
      const boxes = await ModPowBoxSource.generateBoxes('4 -1 7', {
        modpow: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({
        Note: expect.stringContaining('Exponent'),
      });
    });
  });

  describe('generateBoxes — output shape', () => {
    it('box options contain Base, Exponent, Modulus, Result keys', async () => {
      const boxes = await ModPowBoxSource.generateBoxes('4 13 497', {
        modpow: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts).toHaveProperty('Base', '4');
      expect(opts).toHaveProperty('Exponent', '13');
      expect(opts).toHaveProperty('Modulus', '497');
      expect(opts).toHaveProperty('Result', '445');
    });

    it('plaintextOutput contains all key:value pairs', async () => {
      const boxes = await ModPowBoxSource.generateBoxes('4 13 497', {
        modpow: true,
      });
      const text = boxes[0].props.plaintextOutput;
      expect(text).toContain('Result: 445');
    });

    it('rejects operands longer than 100 digits (DoS guard)', async () => {
      const huge = '9'.repeat(200);
      const boxes = await ModPowBoxSource.generateBoxes(`2 ${huge} ${huge}`, {
        modpow: true,
      });
      expect(boxes[0].props.plaintextOutput).toMatch(/100 digits/);
    });

    it('plaintextOutput keeps the base/exponent/modulus lines', async () => {
      const boxes = await ModPowBoxSource.generateBoxes('4 13 497', {
        modpow: true,
      });
      const text = boxes[0].props.plaintextOutput;
      expect(text).toContain('Base: 4');
      expect(text).toContain('Exponent: 13');
      expect(text).toContain('Modulus: 497');
      expect(text).toContain('Result: 445');
    });
  });
});
