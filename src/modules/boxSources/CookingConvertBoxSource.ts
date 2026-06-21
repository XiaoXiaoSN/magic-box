import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// unit -> milliliters (US customary)
const TO_ML: Record<string, number> = {
  ml: 1,
  l: 1000,
  liter: 1000,
  litre: 1000,
  tsp: 4.92892159375,
  tbsp: 14.78676478125,
  floz: 29.5735295625,
  'fl-oz': 29.5735295625,
  cup: 236.5882365,
  pint: 473.176473,
  pt: 473.176473,
  quart: 946.352946,
  qt: 946.352946,
  gallon: 3785.411784,
  gal: 3785.411784,
};

// output units displayed in result, in order
const OUTPUT_UNITS: Array<{ key: string; label: string }> = [
  { key: 'ml', label: 'ml' },
  { key: 'tsp', label: 'tsp' },
  { key: 'tbsp', label: 'tbsp' },
  { key: 'floz', label: 'fl oz' },
  { key: 'cup', label: 'cup' },
  { key: 'pint', label: 'pint' },
  { key: 'quart', label: 'quart' },
  { key: 'gallon', label: 'gallon' },
  { key: 'l', label: 'L' },
];

const SUPPORTED_UNITS = Object.keys(TO_ML).join(', ');

// formats a number: integer-exact when possible, otherwise 6 decimal places trimmed of trailing zeros
function formatValue(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return String(Number.parseFloat(n.toFixed(6)));
}

// normalizes raw unit text to a TO_ML key: lowercase, collapse internal spaces
function normalizeUnit(raw: string): string {
  return raw.toLowerCase().replace(/\s+/g, '');
}

// builds k:v plaintext from a record for the box plaintextOutput field
function kvToPlaintext(kv: Record<string, string>): string {
  return Object.entries(kv)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

export const CookingConvertBoxSource = {
  name: 'Cooking Convert',
  description:
    'Convert cooking volumes between cup, tbsp, tsp, fl oz, ml, L, pint, quart, gallon (US).',
  defaultInput: '1 cup ::cooking',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'cooking', 'volume')) return [];

    const text = trim(input);
    if (text.length > 64) return [];

    // capture: <number> <rest-as-unit> — allow 'fl oz' with a space
    const match = /^([+-]?\d+(?:\.\d*)?)[\s]+(.+)$/.exec(text);
    if (!match) {
      return [buildErrorBox()];
    }

    const value = Number.parseFloat(match[1]);
    if (!Number.isFinite(value)) {
      return [buildErrorBox()];
    }

    const unitKey = normalizeUnit(match[2]);
    const unitML = TO_ML[unitKey];
    if (unitML === undefined) {
      return [buildErrorBox()];
    }

    const valueML = value * unitML;

    const kv: Record<string, string> = {
      Input: `${formatValue(value)} ${match[2].trim()}`,
    };

    for (const { key, label } of OUTPUT_UNITS) {
      const converted = valueML / TO_ML[key];
      kv[label] = formatValue(converted);
    }

    const plaintext = kvToPlaintext(kv);

    return [
      new BoxBuilder('Cooking Convert', plaintext)
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(kv)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

function buildErrorBox(): Box {
  const msg = `Invalid input. Expected: <number> <unit>\nSupported units: ${SUPPORTED_UNITS}`;
  return new BoxBuilder('Cooking Convert', msg).setPriority(Priority).build();
}

export default CookingConvertBoxSource;
