import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { ShannonEntropyBoxSource } from '../ShannonEntropyBoxSource';

describe('ShannonEntropyBoxSource', () => {
  describe('generateBoxes', () => {
    it('returns [] when no matching option key', async () => {
      const boxes = await ShannonEntropyBoxSource.generateBoxes('hello', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for empty input', async () => {
      const boxes = await ShannonEntropyBoxSource.generateBoxes('', {
        entropy: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('single distinct symbol → 0.000 bits/symbol', async () => {
      const boxes = await ShannonEntropyBoxSource.generateBoxes('aaaa', {
        entropy: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Entropy).toBe('0.000 bits/symbol');
      expect(opts['Unique Symbols']).toBe('1');
    });

    it("'ab' → 1.000 bits/symbol, 2 unique symbols", async () => {
      const boxes = await ShannonEntropyBoxSource.generateBoxes('ab', {
        entropy: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Entropy).toBe('1.000 bits/symbol');
      expect(opts['Unique Symbols']).toBe('2');
      expect(opts.Length).toBe('2 symbols');
      expect(opts['Total Bits']).toBe('2');
    });

    // a=4, b=4, c=3, d=1, N=12 → H ≈ 1.855 bits/symbol, total bits = round(1.855*12) = 22
    it("'aaaabbbbcccd' → 1.855 bits/symbol", async () => {
      const boxes = await ShannonEntropyBoxSource.generateBoxes(
        'aaaabbbbcccd',
        { entropy: true },
      );
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Entropy).toBe('1.855 bits/symbol');
      expect(opts['Unique Symbols']).toBe('4');
      expect(opts.Length).toBe('12 symbols');
      expect(opts['Total Bits']).toBe('22');
    });

    it("'abcd' (4 equal) → 2.000 bits/symbol", async () => {
      const boxes = await ShannonEntropyBoxSource.generateBoxes('abcd', {
        entropy: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Entropy).toBe('2.000 bits/symbol');
      expect(opts['Unique Symbols']).toBe('4');
    });

    it('::shannon alias triggers the box', async () => {
      const boxes = await ShannonEntropyBoxSource.generateBoxes('ab', {
        shannon: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Entropy).toBe('1.000 bits/symbol');
    });

    it('uses KeyValueBoxTemplate', async () => {
      const boxes = await ShannonEntropyBoxSource.generateBoxes('ab', {
        entropy: true,
      });
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
    });

    it('sets priority to 10', async () => {
      const boxes = await ShannonEntropyBoxSource.generateBoxes('ab', {
        entropy: true,
      });
      expect(boxes[0].props.priority).toBe(10);
    });

    it('box name is Shannon Entropy', async () => {
      const boxes = await ShannonEntropyBoxSource.generateBoxes('ab', {
        entropy: true,
      });
      expect(boxes[0].props.name).toBe('Shannon Entropy');
    });
  });
});
