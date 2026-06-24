import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { MetricVolumeBoxSource } from '../MetricVolumeBoxSource';

describe('MetricVolumeBoxSource', () => {
  describe('generateBoxes', () => {
    it('returns [] when no option is provided', async () => {
      const boxes = await MetricVolumeBoxSource.generateBoxes('1 m3', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when unrelated options are provided', async () => {
      const boxes = await MetricVolumeBoxSource.generateBoxes('1 m3', {
        qrcode: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('triggers on ::volumeconvert option key', async () => {
      const boxes = await MetricVolumeBoxSource.generateBoxes('1 m3', {
        volumeconvert: true,
      });
      expect(boxes).toHaveLength(1);
    });

    describe('1 m³ = 1000 L', () => {
      it('converts 1 m3 to 1000 L', async () => {
        const boxes = await MetricVolumeBoxSource.generateBoxes('1 m3', {
          cubicvolume: true,
        });
        expect(boxes).toHaveLength(1);
        expect(boxes[0].props.name).toBe('Volume Convert');
        expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
        expect(boxes[0].props.options?.L).toBe('1000');
      });

      it('converts 1 m3 to 1000000 mL', async () => {
        const boxes = await MetricVolumeBoxSource.generateBoxes('1 m3', {
          cubicvolume: true,
        });
        expect(boxes[0].props.options?.mL).toBe('1000000');
      });

      it('converts 1 m3 to 1000000 cm³', async () => {
        const boxes = await MetricVolumeBoxSource.generateBoxes('1 m3', {
          cubicvolume: true,
        });
        expect(boxes[0].props.options?.['cm³']).toBe('1000000');
      });
    });

    describe('1 L conversions', () => {
      it('converts 1 L to 1000 mL', async () => {
        const boxes = await MetricVolumeBoxSource.generateBoxes('1 l', {
          cubicvolume: true,
        });
        expect(boxes[0].props.options?.mL).toBe('1000');
      });

      it('converts 1 L to 0.001 m³', async () => {
        const boxes = await MetricVolumeBoxSource.generateBoxes('1 l', {
          cubicvolume: true,
        });
        expect(boxes[0].props.options?.['m³']).toBe('0.001');
      });
    });

    describe('1 ft³ ≈ 28.316847 L', () => {
      it('converts 1 ft3 and L starts with 28.31684', async () => {
        const boxes = await MetricVolumeBoxSource.generateBoxes('1 ft3', {
          cubicvolume: true,
        });
        const l = boxes[0].props.options?.L;
        expect(String(l)).toMatch(/^28\.31684/);
      });
    });

    describe('1 usgal ≈ 3.785412 L', () => {
      it('converts 1 usgal and L starts with 3.78541', async () => {
        const boxes = await MetricVolumeBoxSource.generateBoxes('1 usgal', {
          cubicvolume: true,
        });
        const l = boxes[0].props.options?.L;
        expect(String(l)).toMatch(/^3\.78541/);
      });
    });

    describe('superscript ³ support', () => {
      it('converts "1 m³" (unicode superscript) to 1000 L', async () => {
        const boxes = await MetricVolumeBoxSource.generateBoxes('1 m³', {
          cubicvolume: true,
        });
        expect(boxes).toHaveLength(1);
        expect(boxes[0].props.options?.L).toBe('1000');
      });
    });

    describe('1 impgal ≈ 4.54609 L', () => {
      it('converts 1 impgal and L equals 4.54609', async () => {
        const boxes = await MetricVolumeBoxSource.generateBoxes('1 impgal', {
          cubicvolume: true,
        });
        const l = boxes[0].props.options?.L;
        expect(String(l)).toMatch(/^4\.54609/);
      });
    });

    describe('invalid input', () => {
      it('returns an error box for bare "abc"', async () => {
        const boxes = await MetricVolumeBoxSource.generateBoxes('abc', {
          cubicvolume: true,
        });
        expect(boxes).toHaveLength(1);
        expect(boxes[0].props.options?.Error).toBeDefined();
      });

      it('returns an error box for "5 foo" (unknown unit)', async () => {
        const boxes = await MetricVolumeBoxSource.generateBoxes('5 foo', {
          cubicvolume: true,
        });
        expect(boxes).toHaveLength(1);
        expect(boxes[0].props.options?.Error).toBeDefined();
      });
    });

    describe('box metadata', () => {
      it('sets priority to 10', async () => {
        const boxes = await MetricVolumeBoxSource.generateBoxes('1 m3', {
          cubicvolume: true,
        });
        expect(boxes[0].props.priority).toBe(10);
      });

      it('sets plaintextOutput as k:v lines', async () => {
        const boxes = await MetricVolumeBoxSource.generateBoxes('1 m3', {
          cubicvolume: true,
        });
        const text = boxes[0].props.plaintextOutput;
        expect(text).toContain('L: 1000');
        expect(text).toContain('mL: 1000000');
      });
    });
  });
});
