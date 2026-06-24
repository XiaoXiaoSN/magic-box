import { describe, expect, it } from 'vitest';

import { PxRemBoxSource } from '../PxRemBoxSource';

describe('PxRemBoxSource', () => {
  describe('generateBoxes', () => {
    it('should return empty array when no option key is present', async () => {
      const boxes = await PxRemBoxSource.generateBoxes('24px', null);
      expect(boxes).toHaveLength(0);
    });

    it('should return empty array when options object lacks pxrem/rempx', async () => {
      const boxes = await PxRemBoxSource.generateBoxes('24px', { foo: true });
      expect(boxes).toHaveLength(0);
    });

    it('should convert px to rem with default base (24px → rem 1.5)', async () => {
      const boxes = await PxRemBoxSource.generateBoxes('24px', { pxrem: true });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options;
      expect(opts?.px).toBe('24');
      expect(opts?.rem).toBe('1.5');
      expect(opts?.Base).toBe('16px');
    });

    it('should convert rem to px with default base (1.5rem → px 24)', async () => {
      const boxes = await PxRemBoxSource.generateBoxes('1.5rem', {
        pxrem: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options;
      expect(opts?.px).toBe('24');
      expect(opts?.rem).toBe('1.5');
      expect(opts?.Base).toBe('16px');
    });

    it('should use custom base from option value (20px + ::pxrem=10 → rem 2)', async () => {
      const boxes = await PxRemBoxSource.generateBoxes('20px', { pxrem: '10' });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options;
      expect(opts?.px).toBe('20');
      expect(opts?.rem).toBe('2');
      expect(opts?.Base).toBe('10px');
    });

    it('should treat unitless input as px (32 + ::pxrem → rem 2)', async () => {
      const boxes = await PxRemBoxSource.generateBoxes('32', { pxrem: true });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options;
      expect(opts?.px).toBe('32');
      expect(opts?.rem).toBe('2');
    });

    it('should return empty array for non-numeric input', async () => {
      const boxes = await PxRemBoxSource.generateBoxes('abc', { pxrem: true });
      expect(boxes).toHaveLength(0);
    });

    it('should work with rempx option key', async () => {
      const boxes = await PxRemBoxSource.generateBoxes('1rem', { rempx: true });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options;
      expect(opts?.px).toBe('16');
      expect(opts?.rem).toBe('1');
    });

    it('should use KeyValueBoxTemplate', async () => {
      const boxes = await PxRemBoxSource.generateBoxes('24px', { pxrem: true });
      expect(boxes[0].boxTemplate).toBeDefined();
    });

    it('should set priority from source priority', async () => {
      const boxes = await PxRemBoxSource.generateBoxes('24px', { pxrem: true });
      expect(boxes[0].props.priority).toBe(PxRemBoxSource.priority);
    });
  });
});
