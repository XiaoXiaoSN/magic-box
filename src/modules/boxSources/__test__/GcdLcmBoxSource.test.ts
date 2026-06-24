import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { GcdLcmBoxSource } from '../GcdLcmBoxSource';

describe('GcdLcmBoxSource', () => {
  describe('generateBoxes', () => {
    it('returns [] when no option key is provided', async () => {
      const boxes = await GcdLcmBoxSource.generateBoxes('12, 18, 24', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when an unrelated option key is provided', async () => {
      const boxes = await GcdLcmBoxSource.generateBoxes('12, 18, 24', {
        base64: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('computes GCD=6 and LCM=72 for 12, 18, 24 with ::gcd', async () => {
      const boxes = await GcdLcmBoxSource.generateBoxes('12, 18, 24', {
        gcd: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('GCD / LCM');
      expect(boxes[0].props.priority).toBe(10);
      expect(boxes[0].props.options).toMatchObject({ GCD: '6', LCM: '72' });
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
    });

    it('computes GCD=6 and LCM=72 for 12, 18, 24 with ::lcm', async () => {
      const boxes = await GcdLcmBoxSource.generateBoxes('12, 18, 24', {
        lcm: true,
      });
      expect(boxes[0].props.options).toMatchObject({ GCD: '6', LCM: '72' });
    });

    it('handles space-separated input: 4 6 → GCD=2 LCM=12', async () => {
      const boxes = await GcdLcmBoxSource.generateBoxes('4 6', { gcd: true });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({ GCD: '2', LCM: '12' });
    });

    it('handles zero operand: 0, 5 → GCD=5 LCM=0', async () => {
      const boxes = await GcdLcmBoxSource.generateBoxes('0, 5', { gcd: true });
      expect(boxes[0].props.options).toMatchObject({ GCD: '5', LCM: '0' });
    });

    it('handles negative numbers: -12, 8 → GCD=4 LCM=24', async () => {
      const boxes = await GcdLcmBoxSource.generateBoxes('-12, 8', {
        gcd: true,
      });
      expect(boxes[0].props.options).toMatchObject({ GCD: '4', LCM: '24' });
    });

    it('preserves full precision for large BigInt operands', async () => {
      // gcd(12345678901234567890, 98765432109876543210)
      // verify GCD * LCM == |a * b| (fundamental identity)
      const a = 12345678901234567890n;
      const b = 98765432109876543210n;
      const boxes = await GcdLcmBoxSource.generateBoxes(
        '12345678901234567890, 98765432109876543210',
        { gcd: true },
      );
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      const gcdVal = BigInt(opts.GCD);
      const lcmVal = BigInt(opts.LCM);
      // GCD must be a multi-digit number (not 1 or trivially small)
      expect(gcdVal > 1n).toBe(true);
      // BigInt identity: gcd * lcm == |a * b|
      expect(gcdVal * lcmVal).toBe(a * b);
    });

    it('returns error box for a single number', async () => {
      const boxes = await GcdLcmBoxSource.generateBoxes('5', { gcd: true });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Note).toMatch(/at least two/i);
    });

    it('returns error box for non-integer tokens', async () => {
      const boxes = await GcdLcmBoxSource.generateBoxes('a, b', {
        gcd: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Note).toMatch(/integers/i);
    });

    it('plaintextOutput is non-empty and contains key: value lines', async () => {
      const boxes = await GcdLcmBoxSource.generateBoxes('12, 18', {
        gcd: true,
      });
      const text = boxes[0].props.plaintextOutput;
      expect(text).toContain('GCD: 6');
      expect(text).toContain('LCM: 36');
    });
  });
});
