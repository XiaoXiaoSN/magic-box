import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { FactorialBoxSource } from '../FactorialBoxSource';

describe('FactorialBoxSource', () => {
  describe('generateBoxes — no option key', () => {
    it('returns [] when options are null', async () => {
      const boxes = await FactorialBoxSource.generateBoxes('5', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when ::factorial option is absent', async () => {
      const boxes = await FactorialBoxSource.generateBoxes('5', {
        other: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes — option value carries n (::factorial=<n>)', () => {
    it('computes 10! = 3628800 from option value', async () => {
      const boxes = await FactorialBoxSource.generateBoxes('', {
        factorial: '10',
      });
      expect(boxes).toHaveLength(1);
      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv.n).toBe('10');
      expect(kv['n!']).toBe('3628800');
    });

    it('ignores input when option value is numeric', async () => {
      // option value '10' takes precedence over input 'abc'
      const boxes = await FactorialBoxSource.generateBoxes('abc', {
        factorial: '10',
      });
      expect(boxes).toHaveLength(1);
      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv['n!']).toBe('3628800');
    });
  });

  describe('generateBoxes — n from input (::factorial flag)', () => {
    it('computes 5! = 120', async () => {
      // verified: 5! = 120
      const boxes = await FactorialBoxSource.generateBoxes('5', {
        factorial: true,
      });
      expect(boxes).toHaveLength(1);
      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv.n).toBe('5');
      expect(kv['n!']).toBe('120');
      expect(kv.Digits).toBe('3');
    });

    it('computes 0! = 1', async () => {
      const boxes = await FactorialBoxSource.generateBoxes('0', {
        factorial: true,
      });
      expect(boxes).toHaveLength(1);
      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv['n!']).toBe('1');
    });

    it('computes 1! = 1', async () => {
      const boxes = await FactorialBoxSource.generateBoxes('1', {
        factorial: true,
      });
      expect(boxes).toHaveLength(1);
      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv['n!']).toBe('1');
    });

    it('computes 20! = 2432902008176640000', async () => {
      // verified: 20! = 2432902008176640000
      const boxes = await FactorialBoxSource.generateBoxes('20', {
        factorial: true,
      });
      expect(boxes).toHaveLength(1);
      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv.n).toBe('20');
      expect(kv['n!']).toBe('2432902008176640000');
    });

    it('computes 100! and reports 158 digits', async () => {
      // verified: 100! has exactly 158 decimal digits
      const boxes = await FactorialBoxSource.generateBoxes('100', {
        factorial: true,
      });
      expect(boxes).toHaveLength(1);
      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv.Digits).toBe('158');
      // 100 <= 2000 so full value is shown
      expect(kv['n!']).not.toBe('too long to display in full');
      expect(kv['n!'].length).toBe(158);
    });
  });

  describe('generateBoxes — large n (n > 2000)', () => {
    it('abbreviates 5000! and provides First 20 / Last 20 / Digits', async () => {
      const boxes = await FactorialBoxSource.generateBoxes('5000', {
        factorial: true,
      });
      expect(boxes).toHaveLength(1);
      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv['n!']).toBe('too long to display in full');
      // verified: 5000! has 16326 digits
      expect(kv.Digits).toBe('16326');
      expect(kv['First 20']).toHaveLength(20);
      expect(kv['Last 20']).toHaveLength(20);
      // last 20 digits of 5000! must end in many zeros
      expect(kv['Last 20']).toMatch(/0+$/);
    });
  });

  describe('generateBoxes — invalid input', () => {
    it('returns error box for non-integer input "abc"', async () => {
      const boxes = await FactorialBoxSource.generateBoxes('abc', {
        factorial: true,
      });
      expect(boxes).toHaveLength(1);
      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv.Error).toBeTruthy();
    });

    it('returns error box when n exceeds MAX_N (200000)', async () => {
      const boxes = await FactorialBoxSource.generateBoxes('200000', {
        factorial: true,
      });
      expect(boxes).toHaveLength(1);
      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv.Error).toMatch(/20000/);
    });

    it('returns error box for negative-like input "-5" (non-digit chars)', async () => {
      const boxes = await FactorialBoxSource.generateBoxes('-5', {
        factorial: true,
      });
      expect(boxes).toHaveLength(1);
      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv.Error).toBeTruthy();
    });
  });

  describe('generateBoxes — box metadata', () => {
    it('uses KeyValueBoxTemplate', async () => {
      const boxes = await FactorialBoxSource.generateBoxes('5', {
        factorial: true,
      });
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
    });

    it('sets priority to 10', async () => {
      const boxes = await FactorialBoxSource.generateBoxes('5', {
        factorial: true,
      });
      expect(boxes[0].props.priority).toBe(10);
    });

    it('sets box name to "Factorial"', async () => {
      const boxes = await FactorialBoxSource.generateBoxes('5', {
        factorial: true,
      });
      expect(boxes[0].props.name).toBe('Factorial');
    });
  });
});
