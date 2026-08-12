import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { BmiBoxSource } from '../BmiBoxSource';

describe('BmiBoxSource', () => {
  describe('generateBoxes — option gate', () => {
    it('returns [] when no options are provided', async () => {
      const boxes = await BmiBoxSource.generateBoxes('70kg 1.75m', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when ::bmi option is absent', async () => {
      const boxes = await BmiBoxSource.generateBoxes('70kg 1.75m', {
        qr: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes — metric', () => {
    it('computes 70kg 1.75m → BMI 22.9, Category Normal', async () => {
      // 70 / (1.75^2) = 70 / 3.0625 = 22.857… → rounds to 22.9
      const boxes = await BmiBoxSource.generateBoxes('70kg 1.75m', {
        bmi: true,
      });
      expect(boxes).toHaveLength(1);

      const { options, name, priority } = boxes[0].props;
      expect(name).toBe('BMI');
      expect(priority).toBe(10);
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);

      expect(options?.BMI).toBe('22.9');
      expect(options?.Category).toBe('Normal');
    });

    it('handles cm height: 70kg 175cm → same as 1.75m → BMI 22.9', async () => {
      const boxes = await BmiBoxSource.generateBoxes('70kg 175cm', {
        bmi: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.BMI).toBe('22.9');
      expect(boxes[0].props.options?.Category).toBe('Normal');
    });

    it('underweight: 50kg 1.8m → BMI 15.4, Category Underweight', async () => {
      // 50 / (1.8^2) = 50 / 3.24 = 15.432… → 15.4
      const boxes = await BmiBoxSource.generateBoxes('50kg 1.8m', {
        bmi: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.BMI).toBe('15.4');
      expect(boxes[0].props.options?.Category).toBe('Underweight');
    });

    it('obese: 120kg 1.7m → BMI 41.5, Category Obese', async () => {
      // 120 / (1.7^2) = 120 / 2.89 = 41.522… → 41.5
      const boxes = await BmiBoxSource.generateBoxes('120kg 1.7m', {
        bmi: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.BMI).toBe('41.5');
      expect(boxes[0].props.options?.Category).toBe('Obese');
    });
  });

  describe('generateBoxes — imperial', () => {
    it('154lb 69in → BMI ≈ 22.7 ± 0.2, Category Normal', async () => {
      // 154lb = 69.853kg, 69in = 1.7526m → 69.853 / (1.7526^2) = 69.853 / 3.0716 ≈ 22.74 → 22.7
      const boxes = await BmiBoxSource.generateBoxes('154lb 69in', {
        bmi: true,
      });
      expect(boxes).toHaveLength(1);

      const bmi = Number.parseFloat(boxes[0].props.options?.BMI as string);
      expect(bmi).toBeGreaterThanOrEqual(22.5);
      expect(bmi).toBeLessThanOrEqual(22.9);
      expect(boxes[0].props.options?.Category).toBe('Normal');
    });

    it('accepts lbs suffix', async () => {
      const boxes = await BmiBoxSource.generateBoxes('154lbs 69in', {
        bmi: true,
      });
      expect(boxes).toHaveLength(1);
      const bmi = Number.parseFloat(boxes[0].props.options?.BMI as string);
      expect(bmi).toBeGreaterThanOrEqual(22.5);
      expect(bmi).toBeLessThanOrEqual(22.9);
    });
  });

  describe('generateBoxes — invalid / guidance', () => {
    it('returns a guidance box when input has no recognizable units', async () => {
      const boxes = await BmiBoxSource.generateBoxes('hello', { bmi: true });
      expect(boxes).toHaveLength(1);
      // guidance box contains format hints, not a numeric BMI
      expect(boxes[0].props.options?.BMI).toBeUndefined();
      const text = boxes[0].props.plaintextOutput;
      expect(text).toMatch(/Example/i);
    });

    it('returns [] for input longer than 64 characters', async () => {
      const long = `${'70kg 1.75m '.repeat(10)}`;
      const boxes = await BmiBoxSource.generateBoxes(long, { bmi: true });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes — plaintextOutput', () => {
    it('plaintextOutput is non-empty k:v text for valid input', async () => {
      const boxes = await BmiBoxSource.generateBoxes('70kg 1.75m', {
        bmi: true,
      });
      const text = boxes[0].props.plaintextOutput;
      expect(text).not.toBe('');
      expect(text).toContain('BMI:');
      expect(text).toContain('22.9');
    });
  });
});
