import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// matches an optional minus sign followed by digits and an optional decimal part
const numberPattern = /^-?\d+(\.\d+)?$/;

export const NumberFormatBoxSource = {
  defaultDisabled: true,
  name: 'Number Format',
  description:
    'Format a number with thousands separators, scientific, and compact notation.',
  defaultInput: '1234567.89 ::numformat',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'numformat', 'numfmt')) return [];

    const raw = trim(input);
    // no legitimate number literal is this long; bound regex + Intl work
    if (raw.length > 100) return [];
    if (!numberPattern.test(raw)) return [];

    const n = Number.parseFloat(raw);

    // group via BigInt for integers (exact for any size) and keep all decimals
    // for fractions (toLocaleString defaults to rounding at 3 places)
    const grouped = raw.includes('.')
      ? n.toLocaleString('en-US', { maximumFractionDigits: 20 })
      : BigInt(raw).toLocaleString('en-US');
    const compact = new Intl.NumberFormat('en-US', {
      notation: 'compact',
    }).format(n);
    const scientific = n.toExponential();

    const output: Record<string, string> = {
      Grouped: grouped,
      Compact: compact,
      Scientific: scientific,
      Plain: raw,
    };

    const plaintextOutput = Object.entries(output)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    return [
      new BoxBuilder('Number Format', plaintextOutput)
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(output)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default NumberFormatBoxSource;
