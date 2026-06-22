import { describe, expect, it } from 'vitest';

import { CompoundInterestBoxSource } from '../CompoundInterestBoxSource';

describe('CompoundInterestBoxSource', () => {
  describe('generateBoxes', () => {
    it('should return empty array when no compound option is provided', async () => {
      const boxes = await CompoundInterestBoxSource.generateBoxes('1000 5 10');
      expect(boxes).toHaveLength(0);
    });

    it('should return empty array when options is null', async () => {
      const boxes = await CompoundInterestBoxSource.generateBoxes(
        '1000 5 10',
        null,
      );
      expect(boxes).toHaveLength(0);
    });

    it('should compute monthly compounding: 1000 at 5% for 10yr → ~1647.01', async () => {
      // 1000 * (1 + 0.05/12)^120 ≈ 1647.009...
      const boxes = await CompoundInterestBoxSource.generateBoxes('1000 5 10', {
        compound: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Future Value']).toMatch(/^1647\.0/);
    });

    it('should compute annual compounding: 1000 at 5% for 10yr → ~1628.89', async () => {
      // 1000 * 1.05^10 ≈ 1628.894...; ::compound=1 means annual compounding
      const boxes = await CompoundInterestBoxSource.generateBoxes('1000 5 10', {
        compound: '1',
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Future Value']).toMatch(/^1628\.8/);
    });

    it('should compute annual compounding: 1000 at 10% for 1yr → 1100.00', async () => {
      // 1000 * (1 + 0.10/1)^1 = 1100
      const boxes = await CompoundInterestBoxSource.generateBoxes('1000 10 1', {
        compound: '1',
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Future Value']).toBe('1100.00');
    });

    it('should compute interest earned for monthly 1000/5%/10yr ≈ 647.01', async () => {
      const boxes = await CompoundInterestBoxSource.generateBoxes('1000 5 10', {
        compound: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Interest Earned']).toMatch(/^647\.0/);
    });

    it('should compute EAR for 5% monthly ≈ 5.116%', async () => {
      // (1 + 0.05/12)^12 - 1 ≈ 0.05116... → 5.116%
      const boxes = await CompoundInterestBoxSource.generateBoxes('1000 5 10', {
        compound: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Effective Annual Rate']).toMatch(/^5\.11/);
    });

    it('should return an error box for wrong argument count', async () => {
      const boxes = await CompoundInterestBoxSource.generateBoxes('1000 5', {
        compound: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/invalid input/i);
    });

    it('should return an error box for negative principal', async () => {
      const boxes = await CompoundInterestBoxSource.generateBoxes('-100 5 10', {
        compound: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/invalid/i);
    });

    it('should use ::compoundinterest option key as alias', async () => {
      const boxes = await CompoundInterestBoxSource.generateBoxes('1000 5 10', {
        compoundinterest: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Future Value']).toMatch(/^1647\.0/);
    });

    it('should include all required output keys', async () => {
      const boxes = await CompoundInterestBoxSource.generateBoxes('1000 5 10', {
        compound: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts).toHaveProperty('Principal');
      expect(opts).toHaveProperty('Annual Rate');
      expect(opts).toHaveProperty('Years');
      expect(opts).toHaveProperty('Compounds/Year');
      expect(opts).toHaveProperty('Future Value');
      expect(opts).toHaveProperty('Interest Earned');
      expect(opts).toHaveProperty('Effective Annual Rate');
    });

    it('should default to 12 compounds/year when option has no numeric value', async () => {
      const boxes = await CompoundInterestBoxSource.generateBoxes('1000 5 10', {
        compound: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Compounds/Year']).toBe('12');
    });
  });
});
