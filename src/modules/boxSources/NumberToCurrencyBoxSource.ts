import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// max input length guard against pathological strings
const MAX_INPUT_LENGTH = 50;

// ISO 4217 currency code must be exactly 3 letters
const CURRENCY_CODE_RE = /^[A-Za-z]{3}$/;

// only accept plain decimal numbers (no exponents, no currency symbols)
const NUMBER_RE = /^-?\d+(\.\d+)?$/;

function resolveCurrencyCode(raw: string | boolean | null): string {
  if (typeof raw === 'string' && CURRENCY_CODE_RE.test(raw)) {
    return raw.toUpperCase();
  }
  return 'USD';
}

export const NumberToCurrencyBoxSource = {
  name: 'Currency Format',
  description:
    'Format a number as currency. Use ::currency=EUR for a specific ISO 4217 code (default USD).',
  defaultInput: '1234567.5 ::currency',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'currency')) return [];

    const text = trim(input);
    if (!text || text.length > MAX_INPUT_LENGTH) return [];
    if (!NUMBER_RE.test(text)) return [];

    const n = Number.parseFloat(text);
    if (!Number.isFinite(n)) return [];

    const rawCode = extractOptionKeys(options, 'currency');
    // a present but malformed code (e.g. "US", "dollars") is an error; a bare
    // flag / missing value defaults to USD. Intl accepts any well-formed
    // 3-letter code, so this is the only reachable "invalid code" path.
    if (
      typeof rawCode === 'string' &&
      rawCode.length > 0 &&
      !CURRENCY_CODE_RE.test(rawCode)
    ) {
      const errorOutput = `Invalid currency code: "${rawCode}"`;
      return [
        new BoxBuilder('Currency Format', errorOutput)
          .setTemplate(KeyValueBoxTemplate)
          .setOptions({ Error: errorOutput })
          .setPriority(this.priority)
          .build(),
      ];
    }
    const code = resolveCurrencyCode(rawCode ?? null);

    // belt-and-suspenders: an unknown code throws RangeError from Intl.NumberFormat
    let formatter: Intl.NumberFormat;
    try {
      formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: code,
      });
    } catch {
      // invalid ISO 4217 code — surface an error box rather than silently falling back
      const errorOutput = `Invalid currency code: "${code}"`;
      return [
        new BoxBuilder('Currency Format', errorOutput)
          .setTemplate(KeyValueBoxTemplate)
          .setOptions({ Error: errorOutput })
          .setPriority(this.priority)
          .build(),
      ];
    }

    const formatted = formatter.format(n);

    // plain grouped number without currency symbol
    const plain = new Intl.NumberFormat('en-US').format(n);

    const output: Record<string, string> = {
      Formatted: formatted,
      Currency: code,
      Plain: plain,
    };

    return [
      new BoxBuilder('Currency Format', formatted)
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(output)
        .setPriority(Priority)
        .build(),
    ];
  },
};

export default NumberToCurrencyBoxSource;
