import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { FibonacciBoxSource } from '../FibonacciBoxSource';

// F(10) = 55, F(20) = 6765, F(100) = 354224848179261915075

describe('FibonacciBoxSource', () => {
  describe('generateBoxes — no option key', () => {
    it('returns [] when no options are provided', async () => {
      const boxes = await FibonacciBoxSource.generateBoxes('10', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when ::fib option is absent', async () => {
      const boxes = await FibonacciBoxSource.generateBoxes('10', {
        other: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes — small known values', () => {
    it('F(0) = 0', async () => {
      const boxes = await FibonacciBoxSource.generateBoxes('0', { fib: true });
      expect(boxes).toHaveLength(1);
      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv['F(n)']).toBe('0');
    });

    it('F(1) = 1', async () => {
      const boxes = await FibonacciBoxSource.generateBoxes('1', { fib: true });
      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv['F(n)']).toBe('1');
    });

    it('F(2) = 1', async () => {
      const boxes = await FibonacciBoxSource.generateBoxes('2', { fib: true });
      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv['F(n)']).toBe('1');
    });

    it('F(10) = 55', async () => {
      const boxes = await FibonacciBoxSource.generateBoxes('10', { fib: true });
      expect(boxes).toHaveLength(1);
      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv['F(n)']).toBe('55');
      expect(kv.n).toBe('10');
      expect(kv.Digits).toBe('2');
    });

    it('F(100) = 354224848179261915075', async () => {
      const boxes = await FibonacciBoxSource.generateBoxes('100', {
        fib: true,
      });
      expect(boxes).toHaveLength(1);
      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv['F(n)']).toBe('354224848179261915075');
    });
  });

  describe('generateBoxes — option value carries n', () => {
    it('::fib=20 picks n from the option value and returns F(20) = 6765', async () => {
      const boxes = await FibonacciBoxSource.generateBoxes('', { fib: '20' });
      expect(boxes).toHaveLength(1);
      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv['F(n)']).toBe('6765');
      expect(kv.n).toBe('20');
    });
  });

  describe('generateBoxes — large n', () => {
    it('F(10000) Digits is "2090" and value is "too long to display"', async () => {
      const boxes = await FibonacciBoxSource.generateBoxes('10000', {
        fib: true,
      });
      expect(boxes).toHaveLength(1);
      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv.Digits).toBe('2090');
      expect(kv['F(n)']).toBe('too long to display');
      // when too long, first/last 20 digits must be present and non-empty
      expect(kv['First 20']).toHaveLength(20);
      expect(kv['Last 20']).toHaveLength(20);
    });
  });

  describe('generateBoxes — out of range', () => {
    it('n=200000 returns an error box mentioning 100000', async () => {
      const boxes = await FibonacciBoxSource.generateBoxes('200000', {
        fib: true,
      });
      expect(boxes).toHaveLength(1);
      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv.Error).toMatch(/100000/);
    });
  });

  describe('generateBoxes — invalid input', () => {
    it('"abc" returns an error box', async () => {
      const boxes = await FibonacciBoxSource.generateBoxes('abc', {
        fib: true,
      });
      expect(boxes).toHaveLength(1);
      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv.Error).toBeTruthy();
    });

    it('also accepts ::fibonacci option key', async () => {
      const boxes = await FibonacciBoxSource.generateBoxes('10', {
        fibonacci: true,
      });
      expect(boxes).toHaveLength(1);
      const kv = boxes[0].props.options as Record<string, string>;
      expect(kv['F(n)']).toBe('55');
    });
  });

  describe('generateBoxes — box metadata', () => {
    it('uses KeyValueBoxTemplate', async () => {
      const boxes = await FibonacciBoxSource.generateBoxes('10', { fib: true });
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
    });

    it('sets priority to 10', async () => {
      const boxes = await FibonacciBoxSource.generateBoxes('10', { fib: true });
      expect(boxes[0].props.priority).toBe(10);
    });

    it('box name is "Fibonacci"', async () => {
      const boxes = await FibonacciBoxSource.generateBoxes('10', { fib: true });
      expect(boxes[0].props.name).toBe('Fibonacci');
    });

    it('plaintextOutput contains "F(n): 55" for n=10', async () => {
      const boxes = await FibonacciBoxSource.generateBoxes('10', { fib: true });
      expect(boxes[0].props.plaintextOutput).toContain('F(n): 55');
    });
  });
});
