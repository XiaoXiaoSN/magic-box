import { describe, expect, it } from 'vitest';

import { DmsBoxSource } from '../DmsBoxSource';

describe('DmsBoxSource', () => {
  describe('generateBoxes', () => {
    it('returns [] when no option is provided', async () => {
      const boxes = await DmsBoxSource.generateBoxes('40.446195', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when an unrelated option is provided', async () => {
      const boxes = await DmsBoxSource.generateBoxes('40.446195', {
        json: true,
      });
      expect(boxes).toHaveLength(0);
    });

    describe('decimal → DMS', () => {
      it('converts 40.446195 correctly with ::dms', async () => {
        const boxes = await DmsBoxSource.generateBoxes('40.446195', {
          dms: true,
        });
        expect(boxes).toHaveLength(1);

        const opts = boxes[0].props.options as Record<string, string>;
        // 0.446195 * 60 = 26.7717 → 26 min
        // 0.7717 * 60 = 46.302 → 46.30 sec
        expect(opts.Degrees).toBe('40');
        expect(opts.Minutes).toBe('26');
        expect(opts.Seconds).toBe('46.30');
        expect(opts.DMS).toBe('40°26\'46.30"');
        expect(opts.Decimal).toBe('40.446195');
      });

      it('converts 40.446195 correctly with ::latlng', async () => {
        const boxes = await DmsBoxSource.generateBoxes('40.446195', {
          latlng: true,
        });
        expect(boxes).toHaveLength(1);
        const opts = boxes[0].props.options as Record<string, string>;
        expect(opts.Degrees).toBe('40');
        expect(opts.Minutes).toBe('26');
      });

      it('handles negative decimal -73.985', async () => {
        const boxes = await DmsBoxSource.generateBoxes('-73.985', {
          dms: true,
        });
        expect(boxes).toHaveLength(1);
        const opts = boxes[0].props.options as Record<string, string>;
        // magnitude degrees
        expect(opts.Degrees).toBe('73');
        expect(opts.Decimal).toBe('-73.985');
      });

      it('returns box name "DMS Coordinates"', async () => {
        const boxes = await DmsBoxSource.generateBoxes('40.446195', {
          dms: true,
        });
        expect(boxes[0].props.name).toBe('DMS Coordinates');
      });

      it('sets priority correctly', async () => {
        const boxes = await DmsBoxSource.generateBoxes('40.446195', {
          dms: true,
        });
        expect(boxes[0].props.priority).toBe(10);
      });
    });

    describe('DMS → decimal', () => {
      it('converts 40°26\'46.3"N to decimal ≈ 40.4462', async () => {
        const boxes = await DmsBoxSource.generateBoxes('40°26\'46.3"N', {
          dms: true,
        });
        expect(boxes).toHaveLength(1);
        const opts = boxes[0].props.options as Record<string, string>;
        // 40 + 26/60 + 46.3/3600 ≈ 40.446194...
        expect(opts.Decimal.startsWith('40.4461')).toBe(true);
      });

      it('converts 33°51\'54"S to negative decimal', async () => {
        const boxes = await DmsBoxSource.generateBoxes('33°51\'54"S', {
          dms: true,
        });
        expect(boxes).toHaveLength(1);
        const opts = boxes[0].props.options as Record<string, string>;
        // 33 + 51/60 + 54/3600 = 33.865 → negative due to S
        expect(opts.Decimal.startsWith('-33.86')).toBe(true);
      });

      it('converts space-separated DMS without hemisphere', async () => {
        const boxes = await DmsBoxSource.generateBoxes('40 26 40.3', {
          dms: true,
        });
        expect(boxes).toHaveLength(1);
        const opts = boxes[0].props.options as Record<string, string>;
        expect(opts.Degrees).toBe('40');
        expect(opts.Minutes).toBe('26');
      });
    });

    describe('invalid input', () => {
      it('returns a hint box for non-parseable input "abc"', async () => {
        const boxes = await DmsBoxSource.generateBoxes('abc', { dms: true });
        expect(boxes).toHaveLength(1);
        // the hint box content should mention expected formats
        expect(boxes[0].props.plaintextOutput).toContain('Expected formats');
      });

      it('returns [] for input exceeding 100 chars', async () => {
        const long = 'a'.repeat(101);
        const boxes = await DmsBoxSource.generateBoxes(long, { dms: true });
        expect(boxes).toHaveLength(0);
      });

      it('returns [] for out-of-range decimal 999', async () => {
        const boxes = await DmsBoxSource.generateBoxes('999', { dms: true });
        expect(boxes).toHaveLength(0);
      });
    });
  });
});
