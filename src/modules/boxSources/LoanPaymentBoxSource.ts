import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// convert a key-value record to plaintext lines for box plaintextOutput
function kvToPlaintext(kv: Record<string, string>): string {
  return Object.entries(kv)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

// standard amortizing loan: P * r * (1+r)^n / ((1+r)^n - 1)
function computeMonthlyPayment(
  principal: number,
  annualRatePercent: number,
  years: number,
): number {
  const r = annualRatePercent / 100 / 12;
  const n = years * 12;
  if (r === 0) {
    return principal / n;
  }
  const factor = (1 + r) ** n;
  return (principal * r * factor) / (factor - 1);
}

export const LoanPaymentBoxSource = {
  defaultDisabled: true,
  name: 'Loan Payment',
  description:
    'Compute the monthly payment of an amortizing loan. Input: "<principal> <annualRate%> <years>".',
  defaultInput: '200000 5 30 ::loan',
  tag: '#',
  kind: 'Calculate',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'loan', 'mortgage')) return [];

    const text = trim(input);
    if (text.length > 100) return [];

    // split on whitespace and/or commas to get the three numeric tokens
    const parts = text.split(/[\s,]+/).filter(Boolean);

    if (parts.length !== 3) {
      const errorKv = {
        'Expected input': '<principal> <annualRate%> <years>',
        Example: '200000 5 30',
      };
      return [
        new BoxBuilder('Loan Payment', kvToPlaintext(errorKv))
          .setTemplate(KeyValueBoxTemplate)
          .setOptions(errorKv)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const principal = Number.parseFloat(parts[0]);
    const annualRate = Number.parseFloat(parts[1]);
    const years = Number.parseFloat(parts[2]);

    if (
      Number.isNaN(principal) ||
      Number.isNaN(annualRate) ||
      Number.isNaN(years) ||
      principal <= 0 ||
      years <= 0 ||
      annualRate < 0
    ) {
      const errorKv = {
        'Expected input': '<principal> <annualRate%> <years>',
        Example: '200000 5 30',
      };
      return [
        new BoxBuilder('Loan Payment', kvToPlaintext(errorKv))
          .setTemplate(KeyValueBoxTemplate)
          .setOptions(errorKv)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const monthlyPayment = computeMonthlyPayment(principal, annualRate, years);
    const n = years * 12;
    const totalPaid = monthlyPayment * n;
    const totalInterest = totalPaid - principal;

    const round2 = (v: number) => Math.round(v * 100) / 100;

    const kv: Record<string, string> = {
      Principal: round2(principal).toFixed(2),
      'Annual Rate': `${annualRate}%`,
      Term: `${years} year${years !== 1 ? 's' : ''}`,
      'Monthly Payment': round2(monthlyPayment).toFixed(2),
      'Total Paid': round2(totalPaid).toFixed(2),
      'Total Interest': round2(totalInterest).toFixed(2),
      Payments: Number.isInteger(n) ? n.toString() : n.toFixed(2),
    };

    return [
      new BoxBuilder('Loan Payment', kvToPlaintext(kv))
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(kv)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default LoanPaymentBoxSource;
