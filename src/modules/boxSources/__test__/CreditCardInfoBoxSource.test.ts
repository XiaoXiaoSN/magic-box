import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { CreditCardInfoBoxSource } from '../CreditCardInfoBoxSource';

describe('CreditCardInfoBoxSource', () => {
  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(CreditCardInfoBoxSource.name).toBe('Credit Card Info');
      expect(CreditCardInfoBoxSource.tag).toBe('#');
      expect(CreditCardInfoBoxSource.kind).toBe('Validate');
      expect(typeof CreditCardInfoBoxSource.priority).toBe('number');
    });
  });

  describe('generateBoxes - trigger guard', () => {
    it('returns empty array when no option is provided', async () => {
      const boxes = await CreditCardInfoBoxSource.generateBoxes(
        '4111111111111111',
        null,
      );
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty options object', async () => {
      const boxes = await CreditCardInfoBoxSource.generateBoxes(
        '4111111111111111',
        {},
      );
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array when unrelated option is provided', async () => {
      const boxes = await CreditCardInfoBoxSource.generateBoxes(
        '4111111111111111',
        { hash: true },
      );
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes - input validation', () => {
    it('returns empty array for non-digit input', async () => {
      const boxes = await CreditCardInfoBoxSource.generateBoxes(
        'not-a-number',
        {
          cardtype: true,
        },
      );
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for digit string shorter than 12', async () => {
      const boxes = await CreditCardInfoBoxSource.generateBoxes('41111111111', {
        cardtype: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for digit string longer than 19', async () => {
      const boxes = await CreditCardInfoBoxSource.generateBoxes(
        '41111111111111111111',
        {
          cardtype: true,
        },
      );
      expect(boxes).toHaveLength(0);
    });

    it('accepts input with spaces and hyphens', async () => {
      // spaced grouping of 4111111111111111
      const boxes = await CreditCardInfoBoxSource.generateBoxes(
        '4111 1111 1111 1111',
        { cardtype: true },
      );
      expect(boxes).toHaveLength(1);
    });
  });

  describe('generateBoxes - Visa', () => {
    const pan = '4111111111111111';

    it('detects Visa brand', async () => {
      const boxes = await CreditCardInfoBoxSource.generateBoxes(pan, {
        cardtype: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({ Brand: 'Visa' });
    });

    it('reports Luhn Valid true', async () => {
      const boxes = await CreditCardInfoBoxSource.generateBoxes(pan, {
        cardtype: true,
      });
      expect(boxes[0].props.options).toMatchObject({ 'Luhn Valid': 'true' });
    });

    it('masks the number — last 4 are visible', async () => {
      const boxes = await CreditCardInfoBoxSource.generateBoxes(pan, {
        cardtype: true,
      });
      const masked = (boxes[0].props.options as Record<string, string>).Masked;
      expect(masked).toMatch(/1111$/);
    });

    it('masked value does NOT contain the full PAN', async () => {
      const boxes = await CreditCardInfoBoxSource.generateBoxes(pan, {
        cardtype: true,
      });
      const masked = (boxes[0].props.options as Record<string, string>).Masked;
      expect(masked).not.toBe(pan);
      expect(masked).not.toContain(pan);
    });

    it('no option value exposes the full PAN', async () => {
      const boxes = await CreditCardInfoBoxSource.generateBoxes(pan, {
        cardtype: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      for (const value of Object.values(opts)) {
        expect(value).not.toContain(pan);
      }
      expect(boxes[0].props.plaintextOutput).not.toContain(pan);
    });

    it('uses KeyValueBoxTemplate', async () => {
      const boxes = await CreditCardInfoBoxSource.generateBoxes(pan, {
        cardtype: true,
      });
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
    });
  });

  describe('generateBoxes - Mastercard', () => {
    const pan = '5555555555554444';

    it('detects Mastercard brand', async () => {
      const boxes = await CreditCardInfoBoxSource.generateBoxes(pan, {
        cardtype: true,
      });
      expect(boxes[0].props.options).toMatchObject({ Brand: 'Mastercard' });
    });

    it('reports Luhn Valid true', async () => {
      const boxes = await CreditCardInfoBoxSource.generateBoxes(pan, {
        cardtype: true,
      });
      expect(boxes[0].props.options).toMatchObject({ 'Luhn Valid': 'true' });
    });

    it('no option value exposes the full PAN', async () => {
      const boxes = await CreditCardInfoBoxSource.generateBoxes(pan, {
        creditcard: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      for (const value of Object.values(opts)) {
        expect(value).not.toContain(pan);
      }
      expect(boxes[0].props.plaintextOutput).not.toContain(pan);
    });
  });

  describe('generateBoxes - American Express', () => {
    const pan = '378282246310005';

    it('detects American Express brand', async () => {
      const boxes = await CreditCardInfoBoxSource.generateBoxes(pan, {
        cardtype: true,
      });
      expect(boxes[0].props.options).toMatchObject({
        Brand: 'American Express',
      });
    });

    it('reports length 15', async () => {
      const boxes = await CreditCardInfoBoxSource.generateBoxes(pan, {
        cardtype: true,
      });
      expect(boxes[0].props.options).toMatchObject({ Length: '15' });
    });

    it('reports Luhn Valid true', async () => {
      const boxes = await CreditCardInfoBoxSource.generateBoxes(pan, {
        cardtype: true,
      });
      expect(boxes[0].props.options).toMatchObject({ 'Luhn Valid': 'true' });
    });

    it('no option value exposes the full PAN', async () => {
      const boxes = await CreditCardInfoBoxSource.generateBoxes(pan, {
        cardtype: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      for (const value of Object.values(opts)) {
        expect(value).not.toContain(pan);
      }
      expect(boxes[0].props.plaintextOutput).not.toContain(pan);
    });
  });

  describe('generateBoxes - Discover', () => {
    const pan = '6011111111111117';

    it('detects Discover brand', async () => {
      const boxes = await CreditCardInfoBoxSource.generateBoxes(pan, {
        cardtype: true,
      });
      expect(boxes[0].props.options).toMatchObject({ Brand: 'Discover' });
    });

    it('reports Luhn Valid true', async () => {
      const boxes = await CreditCardInfoBoxSource.generateBoxes(pan, {
        cardtype: true,
      });
      expect(boxes[0].props.options).toMatchObject({ 'Luhn Valid': 'true' });
    });

    it('no option value exposes the full PAN', async () => {
      const boxes = await CreditCardInfoBoxSource.generateBoxes(pan, {
        cardtype: true,
      });
      const opts = boxes[0].props.options as Record<string, string>;
      for (const value of Object.values(opts)) {
        expect(value).not.toContain(pan);
      }
      expect(boxes[0].props.plaintextOutput).not.toContain(pan);
    });
  });

  describe('generateBoxes - invalid Luhn', () => {
    it('reports Luhn Valid false for 4111111111111112', async () => {
      const boxes = await CreditCardInfoBoxSource.generateBoxes(
        '4111111111111112',
        { cardtype: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({ 'Luhn Valid': 'false' });
    });
  });

  describe('generateBoxes - ::creditcard trigger key', () => {
    it('responds to ::creditcard option key', async () => {
      const boxes = await CreditCardInfoBoxSource.generateBoxes(
        '4111111111111111',
        { creditcard: true },
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toMatchObject({ Brand: 'Visa' });
    });
  });

  describe('generateBoxes - plaintextOutput format', () => {
    it('uses k:v lines (not JSON)', async () => {
      const boxes = await CreditCardInfoBoxSource.generateBoxes(
        '4111111111111111',
        { cardtype: true },
      );
      const text = boxes[0].props.plaintextOutput;
      // must contain colon-separated lines
      expect(text).toMatch(/^Masked: /m);
      expect(text).toMatch(/^Brand: /m);
      expect(text).toMatch(/^Length: /m);
      expect(text).toMatch(/^Luhn Valid: /m);
      // must NOT be parseable as JSON object
      expect(() => JSON.parse(text)).toThrow();
    });

    it('does not contain the full PAN in plaintextOutput', async () => {
      const pan = '4111111111111111';
      const boxes = await CreditCardInfoBoxSource.generateBoxes(pan, {
        cardtype: true,
      });
      expect(boxes[0].props.plaintextOutput).not.toContain(pan);
    });
  });
});
