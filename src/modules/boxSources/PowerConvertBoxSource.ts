import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// watts per unit — used for all conversions via W as intermediate
const TO_W: Record<string, number> = {
  w: 1,
  kw: 1000,
  mw: 1e6,
  hp: 745.6998715822702, // mechanical horsepower (NIST)
  ps: 735.49875, // metric horsepower
  'btu/h': 0.29307107017,
  btuh: 0.29307107017,
};

// display labels for each output unit, in order
const OUTPUT_UNITS: { key: string; label: string }[] = [
  { key: 'w', label: 'W' },
  { key: 'kw', label: 'kW' },
  { key: 'mw', label: 'MW' },
  { key: 'hp', label: 'hp' },
  { key: 'ps', label: 'PS' },
  { key: 'btu/h', label: 'BTU/h' },
];

// formats a converted value: exact integer if whole, else 6 decimal places stripped of trailing zeros
function formatValue(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return String(Number.parseFloat(n.toFixed(6)));
}

// builds a plaintext "key: value" block suitable for headless rendering
function kvToPlaintext(pairs: Record<string, string>): string {
  return Object.entries(pairs)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

const PARSE_RE = /^(-?\d+(?:\.\d+)?)\s*([a-zA-Z/]+)$/;
const SUPPORTED_UNITS = 'W, kW, MW, hp, PS, BTU/h';

export const PowerConvertBoxSource = {
  defaultDisabled: true,
  name: 'Power Convert',
  description: `Convert power between ${SUPPORTED_UNITS}.`,
  defaultInput: '100 hp ::power',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'power')) return [];

    const raw = trim(input).slice(0, 64);
    const match = PARSE_RE.exec(raw);

    if (!match) {
      // invalid — return a box listing supported units
      const pairs = {
        Error: 'Invalid format. Expected: <number> <unit>',
        'Supported units': SUPPORTED_UNITS,
      };
      return [
        new BoxBuilder('Power Convert', kvToPlaintext(pairs))
          .setTemplate(KeyValueBoxTemplate)
          .setOptions(pairs)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const value = Number.parseFloat(match[1]);
    const unitKey = match[2].toLowerCase();
    const factor = TO_W[unitKey];

    if (factor === undefined) {
      // unknown unit — return a box listing supported units
      const pairs = {
        Error: `Unknown unit: ${match[2]}`,
        'Supported units': SUPPORTED_UNITS,
      };
      return [
        new BoxBuilder('Power Convert', kvToPlaintext(pairs))
          .setTemplate(KeyValueBoxTemplate)
          .setOptions(pairs)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const watts = value * factor;

    // build ordered key-value pairs for all output units + the original input
    const kvPairs: Record<string, string> = {
      Input: raw,
    };

    for (const { key, label } of OUTPUT_UNITS) {
      kvPairs[label] = formatValue(watts / TO_W[key]);
    }

    const plaintext = kvToPlaintext(kvPairs);

    return [
      new BoxBuilder('Power Convert', plaintext)
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(kvPairs)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default PowerConvertBoxSource;
