import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// build plaintext from key-value pairs as "key: value" lines
function kvToPlaintext(record: Record<string, string>): string {
  return Object.entries(record)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

export const CompoundInterestBoxSource = {
  defaultDisabled: true,
  name: 'Compound Interest',
  description:
    'Future value with compound interest. Input: "<principal> <annualRate%> <years>". ::compound=<n> for compounds/year (default 12).',
  defaultInput: '1000 5 10 ::compound',
  tag: '#',
  kind: 'Calculate',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'compound', 'compoundinterest')) return [];

    const trimmed = trim(input);

    // cap to avoid runaway inputs
    if (trimmed.length > 100) {
      return [
        new BoxBuilder(
          'Compound Interest',
          'Input too long (max 100 characters).',
        )
          .setPriority(this.priority)
          .build(),
      ];
    }

    const parts = trimmed.split(/\s+/).filter((p) => p.length > 0);
    if (parts.length !== 3) {
      return [
        new BoxBuilder(
          'Compound Interest',
          'Invalid input. Expected: "<principal> <annualRate%> <years>".',
        )
          .setPriority(this.priority)
          .build(),
      ];
    }

    const principal = Number.parseFloat(parts[0]);
    const annualRatePct = Number.parseFloat(parts[1]);
    const years = Number.parseFloat(parts[2]);

    if (
      Number.isNaN(principal) ||
      Number.isNaN(annualRatePct) ||
      Number.isNaN(years) ||
      principal < 0 ||
      annualRatePct < 0 ||
      years < 0
    ) {
      return [
        new BoxBuilder(
          'Compound Interest',
          'Invalid values. Principal and years must be non-negative numbers.',
        )
          .setPriority(this.priority)
          .build(),
      ];
    }

    // resolve compounds/year from option value; default 12 (monthly)
    let compoundsPerYear = 12;
    const rawN = extractOptionKeys(options, 'compound', 'compoundinterest');
    if (rawN !== null && rawN !== true) {
      const parsed = Number.parseInt(String(rawN), 10);
      if (!Number.isNaN(parsed)) {
        // clamp to valid range
        compoundsPerYear = Math.min(365, Math.max(1, parsed));
      }
    }

    const r = annualRatePct / 100;
    const n = compoundsPerYear;
    const t = years;

    // A = P * (1 + r/n)^(n*t)
    const futureValue = principal * (1 + r / n) ** (n * t);
    const interestEarned = futureValue - principal;

    // EAR = (1 + r/n)^n - 1, expressed as a percentage
    const ear = ((1 + r / n) ** n - 1) * 100;

    const output: Record<string, string> = {
      Principal: principal.toFixed(2),
      'Annual Rate': `${annualRatePct.toFixed(2)}%`,
      Years: years.toString(),
      'Compounds/Year': n.toString(),
      'Future Value': futureValue.toFixed(2),
      'Interest Earned': interestEarned.toFixed(2),
      'Effective Annual Rate': `${ear.toFixed(3)}%`,
    };

    return [
      new BoxBuilder('Compound Interest', kvToPlaintext(output))
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(output)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default CompoundInterestBoxSource;
