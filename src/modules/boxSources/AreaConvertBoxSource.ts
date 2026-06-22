import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// unit (normalized) -> square meters
const TO_M2: Record<string, number> = {
  m2: 1,
  km2: 1e6,
  cm2: 1e-4,
  mm2: 1e-6,
  ft2: 0.09290304,
  in2: 0.00064516,
  yd2: 0.83612736,
  acre: 4046.8564224,
  hectare: 10000,
  ha: 10000,
  mi2: 2589988.110336,
};

// output units with display labels, in display order
const OUTPUT_UNITS: { key: string; label: string }[] = [
  { key: 'm2', label: 'm²' },
  { key: 'km2', label: 'km²' },
  { key: 'cm2', label: 'cm²' },
  { key: 'ft2', label: 'ft²' },
  { key: 'in2', label: 'in²' },
  { key: 'yd2', label: 'yd²' },
  { key: 'acre', label: 'acre' },
  { key: 'hectare', label: 'hectare' },
  { key: 'mi2', label: 'mile²' },
];

// normalize a raw unit string into a key for TO_M2 lookup
function normalizeUnit(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\^2/g, '2')
    .replace(/²/g, '2')
    .replace(/\s+/g, '');
}

// format as integer when exact, otherwise 6 decimal places stripped of trailing zeros
function formatValue(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return String(Number.parseFloat(n.toFixed(6)));
}

// build a plaintext k:v block for the KeyValueBoxTemplate
function kvToPlaintext(pairs: Record<string, string>): string {
  return Object.entries(pairs)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

// list of supported unit names for error messages
const SUPPORTED_UNITS = Object.keys(TO_M2).join(', ');

export const AreaConvertBoxSource = {
  name: 'Area Convert',
  description: 'Convert an area between m², km², ft², acre, hectare, and more.',
  defaultInput: '1 acre ::area',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'area')) return [];

    const raw = trim(input);
    if (!raw || raw.length > 64) return [];

    // parse "<number> <unit>" with optional whitespace
    const match = raw.match(/^(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\s+(.+)$/);
    if (!match) {
      return [
        new BoxBuilder(
          'Area Convert',
          `Format: "<number> <unit>"\nSupported units: ${SUPPORTED_UNITS}`,
        )
          .setOptions({
            Error: 'invalid format',
            Format: '<number> <unit>',
            'Supported units': SUPPORTED_UNITS,
          })
          .setTemplate(KeyValueBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const value = Number.parseFloat(match[1]);
    const unitKey = normalizeUnit(match[2]);

    if (!(unitKey in TO_M2)) {
      return [
        new BoxBuilder(
          'Area Convert',
          `Unknown unit "${match[2]}"\nSupported units: ${SUPPORTED_UNITS}`,
        )
          .setOptions({
            Error: `unknown unit "${match[2]}"`,
            'Supported units': SUPPORTED_UNITS,
          })
          .setTemplate(KeyValueBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const valueInM2 = value * TO_M2[unitKey];

    const kvPairs: Record<string, string> = {
      Input: `${formatValue(value)} ${match[2]}`,
    };
    for (const { key, label } of OUTPUT_UNITS) {
      const converted = valueInM2 / TO_M2[key];
      kvPairs[label] = formatValue(converted);
    }

    return [
      new BoxBuilder('Area Convert', kvToPlaintext(kvPairs))
        .setOptions(kvPairs)
        .setTemplate(KeyValueBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default AreaConvertBoxSource;
