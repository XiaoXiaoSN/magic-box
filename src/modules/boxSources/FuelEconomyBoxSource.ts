import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// conversion constants
const LITERS_PER_US_GALLON = 3.785411784;
const LITERS_PER_IMP_GALLON = 4.54609;
const KM_PER_MILE = 1.609344;

// derived shortcut constants for mpg → L/100km
// L/100km = (litersPerGallon / (mpg * kmPerMile)) * 100
const US_MPG_TO_L100KM = (LITERS_PER_US_GALLON / KM_PER_MILE) * 100; // ≈ 235.214583
const IMP_MPG_TO_L100KM = (LITERS_PER_IMP_GALLON / KM_PER_MILE) * 100; // ≈ 282.480936

const MAX_INPUT_LENGTH = 64;

// supported unit aliases → canonical unit key
const UNIT_MAP: Record<string, string> = {
  mpg: 'mpgus',
  mpgus: 'mpgus',
  'mpg-us': 'mpgus',
  mpguk: 'mpgimp',
  'mpg-uk': 'mpgimp',
  mpgimp: 'mpgimp',
  'mpg-imp': 'mpgimp',
  'l/100km': 'l100km',
  l100km: 'l100km',
  'km/l': 'kml',
  kml: 'kml',
};

function formatValue(n: number): string {
  if (!Number.isFinite(n)) return '∞';
  if (Number.isInteger(n)) return String(n);
  return String(Number.parseFloat(n.toFixed(6)));
}

// convert any unit to L/100km as the canonical intermediate
function toL100km(value: number, unit: string): number {
  switch (unit) {
    case 'mpgus':
      return US_MPG_TO_L100KM / value;
    case 'mpgimp':
      return IMP_MPG_TO_L100KM / value;
    case 'l100km':
      return value;
    case 'kml':
      return 100 / value;
    default:
      return Number.NaN;
  }
}

function buildErrorBox(message: string, priority: number): Box {
  return new BoxBuilder('Fuel Economy', message)
    .setTemplate(KeyValueBoxTemplate)
    .setOptions({
      Error: message,
      'Supported units':
        'mpg, mpg-us, mpg-uk, mpgimp, l/100km, l100km, km/l, kml',
      Example: '30 mpg ::fuel',
    })
    .setPriority(priority)
    .build();
}

export const FuelEconomyBoxSource = {
  name: 'Fuel Economy',
  description:
    'Convert fuel economy between MPG (US), MPG (imperial), L/100km, and km/L.',
  defaultInput: '30 mpg ::fuel',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'fuel', 'mpg')) return [];

    const raw = trim(input);
    if (raw.length === 0 || raw.length > MAX_INPUT_LENGTH) {
      return [
        buildErrorBox(
          'Input is empty or too long (max 64 chars).',
          this.priority,
        ),
      ];
    }

    // expect "<number> <unit>"
    const parts = raw.split(/\s+/);
    if (parts.length !== 2) {
      return [
        buildErrorBox(
          `Invalid format: "${raw}". Use "<number> <unit>".`,
          this.priority,
        ),
      ];
    }

    const [rawValue, rawUnit] = parts;
    const value = Number.parseFloat(rawValue);

    if (Number.isNaN(value) || !Number.isFinite(value)) {
      return [
        buildErrorBox(`"${rawValue}" is not a valid number.`, this.priority),
      ];
    }

    if (value <= 0) {
      return [buildErrorBox('Value must be greater than 0.', this.priority)];
    }

    const unit = UNIT_MAP[rawUnit.toLowerCase()];
    if (!unit) {
      return [
        buildErrorBox(
          `Unknown unit "${rawUnit}". Supported: mpg, mpg-us, mpg-uk, mpgimp, l/100km, l100km, km/l, kml.`,
          this.priority,
        ),
      ];
    }

    const l100km = toL100km(value, unit);
    const mpgUS = US_MPG_TO_L100KM / l100km;
    const mpgImp = IMP_MPG_TO_L100KM / l100km;
    const kmPerL = 100 / l100km;

    const inputLabel = `${formatValue(value)} ${rawUnit}`;
    const output: Record<string, string> = {
      Input: inputLabel,
      'MPG (US)': formatValue(mpgUS),
      'MPG (imp)': formatValue(mpgImp),
      'L/100km': formatValue(l100km),
      'km/L': formatValue(kmPerL),
    };

    // build human-readable plaintext for headless/TUI consumers
    const plaintext = Object.entries(output)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    const box = new BoxBuilder('Fuel Economy', plaintext)
      .setTemplate(KeyValueBoxTemplate)
      .setOptions(output)
      .setPriority(this.priority)
      .build();

    return [box];
  },
};

export default FuelEconomyBoxSource;
