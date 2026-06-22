import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { FractionBoxSource } from '../FractionBoxSource';

describe('FractionBoxSource', () => {
  describe('generateBoxes', () => {
    it('should return [] when no option is provided', async () => {
      const boxes = await FractionBoxSource.generateBoxes('0.75', null);
      expect(boxes).toHaveLength(0);
    });

    it('should return [] when unrelated options are provided', async () => {
      const boxes = await FractionBoxSource.generateBoxes('0.75', {
        qrcode: true,
      });
      expect(boxes).toHaveLength(0);
    });

    describe('decimal → fraction', () => {
      it('converts 0.75 to 3/4', async () => {
        const boxes = await FractionBoxSource.generateBoxes('0.75', {
          fraction: true,
        });
        expect(boxes).toHaveLength(1);
        expect(boxes[0].props.name).toBe('Fraction');
        expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
        expect(boxes[0].props.options?.Fraction).toBe('3/4');
        expect(boxes[0].props.options?.Decimal).toBe('0.75');
      });

      it('converts 0.5 to 1/2', async () => {
        const boxes = await FractionBoxSource.generateBoxes('0.5', {
          fraction: true,
        });
        expect(boxes[0].props.options?.Fraction).toBe('1/2');
      });

      it('converts 0.333 exactly to 333/1000 (not 1/3)', async () => {
        const boxes = await FractionBoxSource.generateBoxes('0.333', {
          fraction: true,
        });
        expect(boxes[0].props.options?.Fraction).toBe('333/1000');
      });

      it('converts 0.1 to 1/10', async () => {
        const boxes = await FractionBoxSource.generateBoxes('0.1', {
          fraction: true,
        });
        expect(boxes[0].props.options?.Fraction).toBe('1/10');
      });

      it('converts 1.25 to 5/4 with mixed 1 1/4', async () => {
        const boxes = await FractionBoxSource.generateBoxes('1.25', {
          fraction: true,
        });
        expect(boxes[0].props.options?.Fraction).toBe('5/4');
        expect(boxes[0].props.options?.Mixed).toBe('1 1/4');
      });

      it('converts integer 2 to 2 (denominator 1 collapses)', async () => {
        const boxes = await FractionBoxSource.generateBoxes('2', {
          fraction: true,
        });
        // 2/1 simplifies — denominator 1 means we just show the number
        expect(boxes[0].props.options?.Fraction).toBe('2');
      });

      it('converts 0 to 0', async () => {
        const boxes = await FractionBoxSource.generateBoxes('0', {
          fraction: true,
        });
        expect(boxes[0].props.options?.Fraction).toBe('0');
      });

      it('converts negative -0.5 to -1/2', async () => {
        const boxes = await FractionBoxSource.generateBoxes('-0.5', {
          fraction: true,
        });
        expect(boxes[0].props.options?.Fraction).toBe('-1/2');
      });

      it('works with ::tofraction option key', async () => {
        const boxes = await FractionBoxSource.generateBoxes('0.75', {
          tofraction: true,
        });
        expect(boxes).toHaveLength(1);
        expect(boxes[0].props.options?.Fraction).toBe('3/4');
      });

      it('does not include Mixed key when fraction is proper (< 1)', async () => {
        const boxes = await FractionBoxSource.generateBoxes('0.75', {
          fraction: true,
        });
        expect(boxes[0].props.options?.Mixed).toBeUndefined();
      });
    });

    describe('fraction a/b → decimal', () => {
      it('converts 3/4 to decimal 0.75', async () => {
        const boxes = await FractionBoxSource.generateBoxes('3/4', {
          fraction: true,
        });
        expect(boxes).toHaveLength(1);
        expect(boxes[0].props.options?.Fraction).toBe('3/4');
        expect(boxes[0].props.options?.Decimal).toBe('0.75');
      });

      it('simplifies 6/8 to 3/4 and decimal 0.75', async () => {
        const boxes = await FractionBoxSource.generateBoxes('6/8', {
          fraction: true,
        });
        expect(boxes[0].props.options?.Fraction).toBe('3/4');
        expect(boxes[0].props.options?.Decimal).toBe('0.75');
      });

      it('converts 1/3 to a rounded decimal', async () => {
        const boxes = await FractionBoxSource.generateBoxes('1/3', {
          fraction: true,
        });
        const decimal = boxes[0].props.options?.Decimal;
        expect(decimal).toBeDefined();
        // should start with 0.333
        expect(String(decimal)).toMatch(/^0\.333/);
      });

      it('returns error box for division by zero (5/0)', async () => {
        const boxes = await FractionBoxSource.generateBoxes('5/0', {
          fraction: true,
        });
        expect(boxes).toHaveLength(1);
        expect(boxes[0].props.options?.Error).toBeDefined();
      });
    });

    describe('invalid / unknown input', () => {
      it('returns a usage hint box for unrecognized input', async () => {
        const boxes = await FractionBoxSource.generateBoxes('hello', {
          fraction: true,
        });
        expect(boxes).toHaveLength(1);
        expect(boxes[0].props.options?.Usage).toBeDefined();
      });
    });

    describe('box metadata', () => {
      it('sets priority correctly', async () => {
        const boxes = await FractionBoxSource.generateBoxes('0.75', {
          fraction: true,
        });
        expect(boxes[0].props.priority).toBe(10);
      });

      it('sets plaintextOutput as k:v lines', async () => {
        const boxes = await FractionBoxSource.generateBoxes('0.75', {
          fraction: true,
        });
        const text = boxes[0].props.plaintextOutput;
        expect(text).toContain('Decimal: 0.75');
        expect(text).toContain('Fraction: 3/4');
      });
    });
  });
});
