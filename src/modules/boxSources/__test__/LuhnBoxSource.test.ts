import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { LuhnBoxSource } from '../LuhnBoxSource';

describe('LuhnBoxSource', () => {
  describe('generateBoxes', () => {
    it('returns [] when ::luhn option is absent', async () => {
      const boxes = await LuhnBoxSource.generateBoxes(
        '4111 1111 1111 1111',
        null,
      );
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for non-digit input', async () => {
      const boxes = await LuhnBoxSource.generateBoxes('hello', { luhn: true });
      expect(boxes).toHaveLength(0);
    });

    it('validates Visa test number as valid', async () => {
      const boxes = await LuhnBoxSource.generateBoxes('4111 1111 1111 1111', {
        luhn: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Luhn Check');
      expect(boxes[0].props.options).toMatchObject({
        Number: '4111111111111111',
        Valid: 'true',
        Brand: 'Visa',
      });
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
    });

    it('flags an invalid Visa number', async () => {
      const boxes = await LuhnBoxSource.generateBoxes('4111 1111 1111 1112', {
        luhn: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({
        Valid: 'false',
      });
    });

    it('detects Mastercard brand (5500 0000 0000 0004)', async () => {
      const boxes = await LuhnBoxSource.generateBoxes('5500 0000 0000 0004', {
        luhn: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({
        Valid: 'true',
        Brand: 'Mastercard',
      });
    });

    it('detects Amex brand (378282246310005)', async () => {
      // 378282246310005 is the standard Amex test card number
      const boxes = await LuhnBoxSource.generateBoxes('378282246310005', {
        luhn: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({
        Valid: 'true',
        Brand: 'Amex',
      });
    });

    it('detects Discover brand (6011000000000004)', async () => {
      const boxes = await LuhnBoxSource.generateBoxes('6011000000000004', {
        luhn: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({
        Valid: 'true',
        Brand: 'Discover',
      });
    });

    it('detects 2-series Mastercard at both range bounds (2221-2720)', async () => {
      for (const num of ['2221000000000009', '2720000000000005']) {
        const boxes = await LuhnBoxSource.generateBoxes(num, { luhn: true });
        expect(boxes[0].props.options).toMatchObject({
          Valid: 'true',
          Brand: 'Mastercard',
        });
      }
    });

    it('detects Discover in the 622126-622925 IIN range', async () => {
      const boxes = await LuhnBoxSource.generateBoxes('6222000000000009', {
        luhn: true,
      });
      expect(boxes[0].props.options).toMatchObject({
        Valid: 'true',
        Brand: 'Discover',
      });
    });

    it('rejects digit strings longer than 30 (no real card is that long)', async () => {
      const boxes = await LuhnBoxSource.generateBoxes('1'.repeat(40), {
        luhn: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });
});
