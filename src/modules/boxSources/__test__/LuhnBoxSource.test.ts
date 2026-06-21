import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { LuhnBoxSource } from '../LuhnBoxSource';

describe('LuhnBoxSource', () => {
  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(LuhnBoxSource.name).toBe('Luhn');
      expect(LuhnBoxSource.tag).toBe('#');
      expect(LuhnBoxSource.kind).toBe('Validate');
      expect(typeof LuhnBoxSource.priority).toBe('number');
    });
  });

  describe('generateBoxes - option guard', () => {
    it('returns empty array when no option is provided', async () => {
      const boxes = await LuhnBoxSource.generateBoxes('79927398713', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array when options is empty object', async () => {
      const boxes = await LuhnBoxSource.generateBoxes('79927398713', {});
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array when an unrelated option is provided', async () => {
      const boxes = await LuhnBoxSource.generateBoxes('79927398713', {
        hash: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes - input validation', () => {
    it('returns empty array for non-digit input', async () => {
      const boxes = await LuhnBoxSource.generateBoxes('abc', { luhn: true });
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty input', async () => {
      const boxes = await LuhnBoxSource.generateBoxes('', { luhn: true });
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for input exceeding 40 digits', async () => {
      const boxes = await LuhnBoxSource.generateBoxes('1'.repeat(41), {
        luhn: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for mixed alpha-numeric input', async () => {
      const boxes = await LuhnBoxSource.generateBoxes('1234abc5678', {
        luhn: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes - Luhn validation', () => {
    it('identifies 79927398713 as Luhn-valid', async () => {
      const boxes = await LuhnBoxSource.generateBoxes('79927398713', {
        luhn: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({
        Valid: 'true',
        Input: '79927398713',
      });
    });

    it('identifies 79927398710 as Luhn-invalid', async () => {
      const boxes = await LuhnBoxSource.generateBoxes('79927398710', {
        luhn: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({ Valid: 'false' });
    });

    it('strips spaces before validation — "7992 7398 713" is valid', async () => {
      const boxes = await LuhnBoxSource.generateBoxes('7992 7398 713', {
        luhn: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({
        Valid: 'true',
        Input: '79927398713',
      });
    });

    it('strips hyphens before validation', async () => {
      const boxes = await LuhnBoxSource.generateBoxes('7992-7398-713', {
        luhn: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({
        Valid: 'true',
        Input: '79927398713',
      });
    });
  });

  describe('generateBoxes - check digit', () => {
    it('computes check digit 3 for payload 7992739871', async () => {
      const boxes = await LuhnBoxSource.generateBoxes('7992739871', {
        luhn: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({ 'Check Digit': '3' });
    });

    it('check digit of a valid number makes input+digit Luhn-valid', async () => {
      // using a different known number: 4532015112830366 (Visa test number)
      const payload = '453201511283036';
      const boxes = await LuhnBoxSource.generateBoxes(payload, { luhn: true });
      expect(boxes).toHaveLength(1);
      const checkDigit = boxes[0].props.options?.['Check Digit'];

      // appending the check digit must produce a valid number
      const full = payload + checkDigit;
      const validBoxes = await LuhnBoxSource.generateBoxes(full, {
        luhn: true,
      });
      expect(validBoxes[0].props.options).toMatchObject({ Valid: 'true' });
    });
  });

  describe('generateBoxes - output structure', () => {
    it('returns a single box with KeyValueBoxTemplate', async () => {
      const boxes = await LuhnBoxSource.generateBoxes('79927398713', {
        luhn: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
    });

    it('box options contain all required keys', async () => {
      const boxes = await LuhnBoxSource.generateBoxes('79927398713', {
        luhn: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts).toHaveProperty('Input');
      expect(opts).toHaveProperty('Valid');
      expect(opts).toHaveProperty('Check Digit');
      expect(opts).toHaveProperty('Sum');
    });

    it('Sum is the correct Luhn sum of the input', async () => {
      // luhn sum of 79927398713 is 70
      const boxes = await LuhnBoxSource.generateBoxes('79927398713', {
        luhn: true,
      });
      expect(boxes[0].props.options).toMatchObject({ Sum: '70' });
    });

    it('priority matches source priority', async () => {
      const boxes = await LuhnBoxSource.generateBoxes('79927398713', {
        luhn: true,
      });
      expect(boxes[0].props.priority).toBe(LuhnBoxSource.priority);
    });
  });
});
