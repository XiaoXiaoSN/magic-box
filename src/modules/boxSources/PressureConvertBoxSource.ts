import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 64;

// unit -> pascals conversion factors
const TO_PA: Record<string, number> = {
  pa: 1,
  kpa: 1000,
  hpa: 100,
  mpa: 1e6,
  bar: 100000,
  mbar: 100,
  psi: 6894.757293168,
  atm: 101325,
  mmhg: 133.322387415,
  torr: 101325 / 760,
};

// output unit labels in display order
const OUTPUT_UNITS: Array<[string, string]> = [
  ['Pa', 'pa'],
  ['kPa', 'kpa'],
  ['bar', 'bar'],
  ['psi', 'psi'],
  ['atm', 'atm'],
  ['mmHg', 'mmhg'],
  ['Torr', 'torr'],
];

// formats a number as integer when exact, otherwise rounds to 6 decimal places
function formatValue(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return String(Number.parseFloat(n.toFixed(6)));
}

// build the plaintext representation of a key-value record
function kvToPlaintext(kv: Record<string, string>): string {
  return Object.entries(kv)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

const PARSE_RE = /^(-?\d+(?:\.\d+)?)\s*([a-zA-Z]+)$/;

const SUPPORTED_UNITS = Object.keys(TO_PA)
  .map((u) => u.toUpperCase())
  .join(', ');

export const PressureConvertBoxSource = {
  name: 'Pressure Convert',
  description:
    'Convert a pressure between Pa, kPa, bar, psi, atm, mmHg, and Torr.',
  defaultInput: '1 atm ::pressure',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'pressure')) return [];

    const trimmed = trim(input).slice(0, MAX_INPUT);
    const match = PARSE_RE.exec(trimmed);

    if (!match) {
      const kv = {
        Note: `invalid format — use "<number> <unit>"`,
        'Supported units': SUPPORTED_UNITS,
      };
      return [
        new BoxBuilder('Pressure Convert', kvToPlaintext(kv))
          .setOptions(kv)
          .setTemplate(KeyValueBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const value = Number.parseFloat(match[1]);
    const unitKey = match[2].toLowerCase();

    if (!(unitKey in TO_PA)) {
      const kv = {
        Note: `unknown unit "${match[2]}"`,
        'Supported units': SUPPORTED_UNITS,
      };
      return [
        new BoxBuilder('Pressure Convert', kvToPlaintext(kv))
          .setOptions(kv)
          .setTemplate(KeyValueBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const pa = value * TO_PA[unitKey];

    const kv: Record<string, string> = {
      Input: trimmed,
    };

    for (const [label, key] of OUTPUT_UNITS) {
      kv[label] = formatValue(pa / TO_PA[key]);
    }

    return [
      new BoxBuilder('Pressure Convert', kvToPlaintext(kv))
        .setOptions(kv)
        .setTemplate(KeyValueBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default PressureConvertBoxSource;
