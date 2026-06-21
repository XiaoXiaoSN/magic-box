import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { IsinBoxSource } from '../IsinBoxSource';

describe('IsinBoxSource', () => {
  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(IsinBoxSource.name).toBe('ISIN');
      expect(IsinBoxSource.tag).toBe('#');
      expect(IsinBoxSource.kind).toBe('Validate');
      expect(typeof IsinBoxSource.priority).toBe('number');
    });
  });

  describe('generateBoxes - trigger guard', () => {
    it('returns empty array when no option is provided', async () => {
      const boxes = await IsinBoxSource.generateBoxes('US0378331005', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty options object', async () => {
      const boxes = await IsinBoxSource.generateBoxes('US0378331005', {});
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array when unrelated option is provided', async () => {
      const boxes = await IsinBoxSource.generateBoxes('US0378331005', {
        hash: true,
      });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes - valid ISIN: Apple (US0378331005)', () => {
    it('returns one box', async () => {
      const boxes = await IsinBoxSource.generateBoxes('US0378331005', {
        isin: true,
      });
      expect(boxes).toHaveLength(1);
    });

    it('reports Valid as true', async () => {
      const boxes = await IsinBoxSource.generateBoxes('US0378331005', {
        isin: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Valid).toBe('true');
    });

    it('extracts Country as US', async () => {
      const boxes = await IsinBoxSource.generateBoxes('US0378331005', {
        isin: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Country).toBe('US');
    });

    it('extracts NSIN correctly', async () => {
      const boxes = await IsinBoxSource.generateBoxes('US0378331005', {
        isin: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.NSIN).toBe('037833100');
    });

    it('computes Check Digit as 5', async () => {
      const boxes = await IsinBoxSource.generateBoxes('US0378331005', {
        isin: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Check Digit']).toBe('5');
    });

    it('uses KeyValueBoxTemplate', async () => {
      const boxes = await IsinBoxSource.generateBoxes('US0378331005', {
        isin: true,
      });
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
    });

    it('uses k:v plaintext lines (not JSON)', async () => {
      const boxes = await IsinBoxSource.generateBoxes('US0378331005', {
        isin: true,
      });
      const text = boxes[0].props.plaintextOutput;
      expect(text).toMatch(/^ISIN: /m);
      expect(text).toMatch(/^Country: /m);
      expect(text).toMatch(/^NSIN: /m);
      expect(text).toMatch(/^Valid: /m);
      expect(text).toMatch(/^Check Digit: /m);
      expect(() => JSON.parse(text)).toThrow();
    });

    it('strips surrounding whitespace from input', async () => {
      const boxes = await IsinBoxSource.generateBoxes('  US0378331005  ', {
        isin: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.ISIN).toBe('US0378331005');
      expect(opts.Valid).toBe('true');
    });

    it('accepts lowercase input and uppercases it', async () => {
      const boxes = await IsinBoxSource.generateBoxes('us0378331005', {
        isin: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Valid).toBe('true');
    });
  });

  describe('generateBoxes - valid ISIN: BAE Systems (GB0002634946)', () => {
    it('reports Valid as true', async () => {
      const boxes = await IsinBoxSource.generateBoxes('GB0002634946', {
        isin: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Valid).toBe('true');
    });

    it('extracts Country as GB', async () => {
      const boxes = await IsinBoxSource.generateBoxes('GB0002634946', {
        isin: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Country).toBe('GB');
    });

    it('computes Check Digit as 6', async () => {
      const boxes = await IsinBoxSource.generateBoxes('GB0002634946', {
        isin: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Check Digit']).toBe('6');
    });
  });

  describe('generateBoxes - invalid check digit', () => {
    it('reports Valid as false for US0378331006 (bad check digit)', async () => {
      const boxes = await IsinBoxSource.generateBoxes('US0378331006', {
        isin: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Valid).toBe('false');
    });
  });

  describe('generateBoxes - malformed input', () => {
    it('returns a format-explanation box for "123"', async () => {
      const boxes = await IsinBoxSource.generateBoxes('123', { isin: true });
      expect(boxes).toHaveLength(1);
      // the box should mention format information, not a valid result
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts).toHaveProperty('Format');
    });

    it('returns a format-explanation box for "USXXX"', async () => {
      const boxes = await IsinBoxSource.generateBoxes('USXXX', { isin: true });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts).toHaveProperty('Format');
    });

    it('format box name is still ISIN', async () => {
      const boxes = await IsinBoxSource.generateBoxes('123', { isin: true });
      expect(boxes[0].props.name).toBe('ISIN');
    });

    it('format box uses KeyValueBoxTemplate', async () => {
      const boxes = await IsinBoxSource.generateBoxes('123', { isin: true });
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
    });
  });

  describe('generateBoxes - priority', () => {
    it('box carries the source priority', async () => {
      const boxes = await IsinBoxSource.generateBoxes('US0378331005', {
        isin: true,
      });
      expect(boxes[0].props.priority).toBe(IsinBoxSource.priority);
    });
  });
});
