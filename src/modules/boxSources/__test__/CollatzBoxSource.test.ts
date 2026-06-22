import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { CollatzBoxSource } from '../CollatzBoxSource';

describe('CollatzBoxSource', () => {
  describe('option gating', () => {
    it('returns empty array when no option is provided', async () => {
      const boxes = await CollatzBoxSource.generateBoxes('27', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array when collatz option is absent', async () => {
      const boxes = await CollatzBoxSource.generateBoxes('27', { other: true });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('invalid input', () => {
    it('returns an error box for "0"', async () => {
      const boxes = await CollatzBoxSource.generateBoxes('0', {
        collatz: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/positive integer/i);
    });

    it('returns an error box for "abc"', async () => {
      const boxes = await CollatzBoxSource.generateBoxes('abc', {
        collatz: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/positive integer/i);
    });

    it('returns an error box for "-5"', async () => {
      const boxes = await CollatzBoxSource.generateBoxes('-5', {
        collatz: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/positive integer/i);
    });
  });

  describe('known sequences', () => {
    it('27 → 111 steps, peak 9232', async () => {
      // Collatz(27) is the classic example: 111 steps, peak 9232
      const boxes = await CollatzBoxSource.generateBoxes('27', {
        collatz: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Steps).toBe('111');
      expect(opts.Peak).toBe('9232');
      expect(opts.Number).toBe('27');
    });

    it('1 → 0 steps (already at 1), peak 1', async () => {
      const boxes = await CollatzBoxSource.generateBoxes('1', {
        collatz: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Steps).toBe('0');
      expect(opts.Peak).toBe('1');
    });

    it('6 → 8 steps (6→3→10→5→16→8→4→2→1)', async () => {
      // verified: 6,3,10,5,16,8,4,2,1 — that is 8 steps from 6 to 1
      const boxes = await CollatzBoxSource.generateBoxes('6', {
        collatz: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Steps).toBe('8');
    });

    it('2 → 1 step (2→1)', async () => {
      const boxes = await CollatzBoxSource.generateBoxes('2', {
        collatz: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Steps).toBe('1');
    });
  });

  describe('BigInt correctness', () => {
    it('handles large number 9780657630 without overflow', async () => {
      // this number has a very long sequence; assert Steps is present and numeric
      const boxes = await CollatzBoxSource.generateBoxes('9780657630', {
        collatz: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Steps).toBeDefined();
      expect(Number(opts.Steps)).toBeGreaterThan(0);
      expect(opts.Number).toBe('9780657630');
    });
  });

  describe('box metadata', () => {
    it('uses KeyValueBoxTemplate', async () => {
      const boxes = await CollatzBoxSource.generateBoxes('6', {
        collatz: true,
      });
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
    });

    it('sets name to "Collatz"', async () => {
      const boxes = await CollatzBoxSource.generateBoxes('6', {
        collatz: true,
      });
      expect(boxes[0].props.name).toBe('Collatz');
    });

    it('sets priority to 10', async () => {
      const boxes = await CollatzBoxSource.generateBoxes('6', {
        collatz: true,
      });
      expect(boxes[0].props.priority).toBe(10);
    });

    it('plaintextOutput contains key: value lines', async () => {
      const boxes = await CollatzBoxSource.generateBoxes('2', {
        collatz: true,
      });
      const out = boxes[0].props.plaintextOutput;
      expect(out).toContain('Steps: 1');
      expect(out).toContain('Number: 2');
    });

    it('rejects a value beyond the magnitude cap (DoS guard)', async () => {
      // a 5000-digit number would freeze the main thread; must be rejected fast
      const huge = '9'.repeat(5000);
      const start = Date.now();
      const boxes = await CollatzBoxSource.generateBoxes(huge, {
        collatz: true,
      });
      expect(Date.now() - start).toBeLessThan(200);
      expect(boxes[0].props.options?.Error).toMatch(/maximum|exceeds/i);
    });
  });
});
