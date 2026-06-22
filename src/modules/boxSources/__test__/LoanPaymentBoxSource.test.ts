import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { LoanPaymentBoxSource } from '../LoanPaymentBoxSource';

describe('LoanPaymentBoxSource', () => {
  describe('generateBoxes', () => {
    it('returns [] when no option key is present', async () => {
      const boxes = await LoanPaymentBoxSource.generateBoxes(
        '200000 5 30',
        null,
      );
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when unrelated option is present', async () => {
      const boxes = await LoanPaymentBoxSource.generateBoxes('200000 5 30', {
        qrcode: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('computes $200k / 5% APR / 30yr → monthly payment ≈ 1073.64', async () => {
      const boxes = await LoanPaymentBoxSource.generateBoxes('200000 5 30', {
        loan: true,
      });
      expect(boxes).toHaveLength(1);

      const box = boxes[0];
      expect(box.props.name).toBe('Loan Payment');
      expect(box.props.priority).toBe(10);
      expect(box.boxTemplate).toBe(KeyValueBoxTemplate);

      const opts = box.props.options as Record<string, string>;
      expect(opts['Monthly Payment']).toMatch(/^1073\.6/);
      expect(opts['Total Paid']).toBe('386511.57');
      expect(opts['Total Interest']).toBe('186511.57');
      expect(opts.Payments).toBe('360');
      expect(opts.Principal).toBe('200000.00');
      expect(opts['Annual Rate']).toBe('5%');
      expect(opts.Term).toBe('30 years');
    });

    it('accepts ::mortgage option key', async () => {
      const boxes = await LoanPaymentBoxSource.generateBoxes('200000 5 30', {
        mortgage: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Monthly Payment']).toMatch(/^1073\.6/);
    });

    it('computes zero-interest loan: 1200 / 0% / 1yr → 100/mo', async () => {
      const boxes = await LoanPaymentBoxSource.generateBoxes('1200 0 1', {
        loan: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Monthly Payment']).toBe('100.00');
      expect(opts['Total Paid']).toBe('1200.00');
      expect(opts['Total Interest']).toBe('0.00');
    });

    it('computes $100k / 6% APR / 15yr → monthly payment ≈ 843.86', async () => {
      const boxes = await LoanPaymentBoxSource.generateBoxes('100000 6 15', {
        loan: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Monthly Payment']).toMatch(/^843\.8/);
    });

    it('returns an error box when arg count is wrong (too few)', async () => {
      const boxes = await LoanPaymentBoxSource.generateBoxes('200000 5', {
        loan: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Expected input']).toBeDefined();
    });

    it('returns an error box when args are non-numeric', async () => {
      const boxes = await LoanPaymentBoxSource.generateBoxes('a b c', {
        loan: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Expected input']).toBeDefined();
    });

    it('returns an error box when principal is zero or negative', async () => {
      const boxes = await LoanPaymentBoxSource.generateBoxes('0 5 30', {
        loan: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Expected input']).toBeDefined();
    });

    it('returns an error box when years is zero or negative', async () => {
      const boxes = await LoanPaymentBoxSource.generateBoxes('200000 5 0', {
        loan: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Expected input']).toBeDefined();
    });

    it('returns [] for input exceeding 100 characters', async () => {
      const long = `${'2'.repeat(101)} 5 30`;
      const boxes = await LoanPaymentBoxSource.generateBoxes(long, {
        loan: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('plaintext output contains key: value lines', async () => {
      const boxes = await LoanPaymentBoxSource.generateBoxes('200000 5 30', {
        loan: true,
      });
      const plaintext = boxes[0].props.plaintextOutput;
      expect(plaintext).toContain('Monthly Payment: 1073.6');
      expect(plaintext).toContain('Principal: 200000.00');
    });
  });
});
