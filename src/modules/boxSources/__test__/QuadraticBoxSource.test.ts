import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { QuadraticBoxSource } from '../QuadraticBoxSource';

describe('QuadraticBoxSource', () => {
  describe('no option key', () => {
    it('returns [] when options are null', async () => {
      const boxes = await QuadraticBoxSource.generateBoxes('1 -3 2', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when ::quadratic / ::quad are absent', async () => {
      const boxes = await QuadraticBoxSource.generateBoxes('1 -3 2', {
        other: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('two distinct real roots — x²-3x+2=0 → 2, 1', () => {
    it('produces one box with Root 1=2 and Root 2=1', async () => {
      // (x-1)(x-2)=0: roots 1 and 2. (-b+√D)/2a = (3+1)/2 = 2 is Root 1
      const boxes = await QuadraticBoxSource.generateBoxes('1 -3 2', {
        quadratic: true,
      });
      expect(boxes).toHaveLength(1);

      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv['Root 1']).toBe('2');
      expect(kv['Root 2']).toBe('1');
    });

    it('uses KeyValueBoxTemplate', async () => {
      const boxes = await QuadraticBoxSource.generateBoxes('1 -3 2', {
        quadratic: true,
      });
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
    });

    it('sets priority to 10', async () => {
      const boxes = await QuadraticBoxSource.generateBoxes('1 -3 2', {
        quadratic: true,
      });
      expect(boxes[0].props.priority).toBe(10);
    });

    it('accepts ::quad alias', async () => {
      const boxes = await QuadraticBoxSource.generateBoxes('1 -3 2', {
        quad: true,
      });
      expect(boxes).toHaveLength(1);
      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv['Root 1']).toBe('2');
      expect(kv['Root 2']).toBe('1');
    });
  });

  describe('double root — x²-2x+1=0 → 1', () => {
    it('has Discriminant 0 and a single Root key', async () => {
      const boxes = await QuadraticBoxSource.generateBoxes('1 -2 1', {
        quadratic: true,
      });
      expect(boxes).toHaveLength(1);

      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv.Discriminant).toBe('0');
      expect(kv.Root).toBe('1');
      // no split roots
      expect(kv['Root 1']).toBeUndefined();
      expect(kv['Root 2']).toBeUndefined();
    });
  });

  describe('complex roots — x²+1=0 → ±i', () => {
    it('produces 0 + 1i and 0 - 1i', async () => {
      // D = 0-4 = -4; real = 0, imag = 2/2 = 1
      const boxes = await QuadraticBoxSource.generateBoxes('1 0 1', {
        quadratic: true,
      });
      expect(boxes).toHaveLength(1);

      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv['Root 1']).toBe('0 + 1i');
      expect(kv['Root 2']).toBe('0 - 1i');
    });
  });

  describe('two distinct real roots — x²-5x+6=0 → 3, 2', () => {
    it('returns Root 1=3 Root 2=2', async () => {
      // (x-2)(x-3)=0: (-b+√D)/2a = (5+1)/2 = 3
      const boxes = await QuadraticBoxSource.generateBoxes('1 -5 6', {
        quadratic: true,
      });
      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv['Root 1']).toBe('3');
      expect(kv['Root 2']).toBe('2');
    });
  });

  describe('linear fallback — a=0, 2x-4=0 → root 2', () => {
    it('returns Linear root 2 for "0 2 -4"', async () => {
      const boxes = await QuadraticBoxSource.generateBoxes('0 2 -4', {
        quadratic: true,
      });
      expect(boxes).toHaveLength(1);

      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv['Linear root']).toBe('2');
    });
  });

  describe('degenerate case — a=0 b=0', () => {
    it('returns an error box for "0 0 5"', async () => {
      const boxes = await QuadraticBoxSource.generateBoxes('0 0 5', {
        quadratic: true,
      });
      expect(boxes).toHaveLength(1);
      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv.Error).toBeTruthy();
    });
  });

  describe('invalid input', () => {
    it('returns an error box for non-numeric "a b c"', async () => {
      const boxes = await QuadraticBoxSource.generateBoxes('a b c', {
        quadratic: true,
      });
      expect(boxes).toHaveLength(1);
      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv.Error).toBeTruthy();
    });

    it('returns an error box for too few coefficients "1 2"', async () => {
      const boxes = await QuadraticBoxSource.generateBoxes('1 2', {
        quadratic: true,
      });
      expect(boxes).toHaveLength(1);
      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv.Error).toBeTruthy();
    });
  });
});
