import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// unit -> joules conversion factors (SI exact where defined by convention)
const TO_J: Record<string, number> = {
  j: 1,
  kj: 1000,
  mj: 1e6,
  cal: 4.184,
  kcal: 4184,
  wh: 3600,
  kwh: 3.6e6,
  btu: 1055.05585262,
  ev: 1.602176634e-19,
};

// display labels in output order
const OUTPUT_UNITS: Array<[string, string]> = [
  ['J', 'j'],
  ['kJ', 'kj'],
  ['cal', 'cal'],
  ['kcal', 'kcal'],
  ['Wh', 'wh'],
  ['kWh', 'kwh'],
  ['BTU', 'btu'],
  ['eV', 'ev'],
];

// format a joule-based result value for display:
// - very large or very small non-zero values use exponential notation (6 decimal places)
// - integers display without decimal point
// - otherwise toFixed(6) with trailing zeros stripped
function formatValue(n: number): string {
  const abs = Math.abs(n);
  if (n !== 0 && (abs >= 1e15 || abs < 1e-4)) {
    return n.toExponential(6);
  }
  if (Number.isInteger(n)) {
    return n.toString();
  }
  return n.toFixed(6).replace(/\.?0+$/, '');
}

// build plaintext k:v representation for headless consumers
function kvToPlaintext(kv: Record<string, string>): string {
  return Object.entries(kv)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

const SUPPORTED_UNITS = Object.keys(TO_J).join(', ');
const INPUT_RE = /^(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\s*([a-zA-Z]+)$/;

export const EnergyConvertBoxSource = {
  name: 'Energy Convert',
  description: 'Convert energy between J, kJ, cal, kcal, Wh, kWh, BTU, and eV.',
  defaultInput: '1 kWh ::energy',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'energy')) return [];

    const raw = trim(input);
    if (!raw || raw.length > 64) {
      return [];
    }

    const match = INPUT_RE.exec(raw);
    if (!match) {
      const kv: Record<string, string> = {
        Error: 'Invalid format. Use: <number> <unit>',
        'Supported units': SUPPORTED_UNITS,
      };
      return [
        new BoxBuilder('Energy Convert', kvToPlaintext(kv))
          .setOptions(kv)
          .setTemplate(KeyValueBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const value = Number.parseFloat(match[1]);
    const unitKey = match[2].toLowerCase();

    if (!(unitKey in TO_J)) {
      const kv: Record<string, string> = {
        Error: `Unknown unit: ${match[2]}`,
        'Supported units': SUPPORTED_UNITS,
      };
      return [
        new BoxBuilder('Energy Convert', kvToPlaintext(kv))
          .setOptions(kv)
          .setTemplate(KeyValueBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const joules = value * TO_J[unitKey];

    const kv: Record<string, string> = {
      Input: `${match[1]} ${match[2]}`,
    };
    for (const [label, key] of OUTPUT_UNITS) {
      kv[label] = formatValue(joules / TO_J[key]);
    }

    return [
      new BoxBuilder('Energy Convert', kvToPlaintext(kv))
        .setOptions(kv)
        .setTemplate(KeyValueBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default EnergyConvertBoxSource;
