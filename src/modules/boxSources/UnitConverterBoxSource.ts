import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys, hasOptionKeys } from '@modules/Box';
import type { SharedUnitDefinition } from './UnitConversionData';
import {
  formatConversionValue,
  POWER_UNIT_DEFINITIONS,
  parseStrictNumber,
  SPEED_UNIT_DEFINITIONS,
  STRICT_NUMBER_TOKEN,
} from './UnitConversionData';

type UnitCategory =
  | 'length'
  | 'area'
  | 'volume'
  | 'mass'
  | 'temperature'
  | 'speed'
  | 'pressure'
  | 'power'
  | 'energy'
  | 'datasize'
  | 'datarate'
  | 'duration';

interface UnitDef {
  category: UnitCategory;
  symbol: string;
  name: string;
  // ratio to base unit in category
  ratio?: number;
  // custom conversion to/from base unit if non-linear (e.g. temperature)
  toBase?: (val: number) => number;
  fromBase?: (val: number) => number;
}

const UNITS: Record<string, UnitDef> = {
  // Length (base: m)
  mm: { category: 'length', symbol: 'mm', name: 'Millimeters', ratio: 0.001 },
  cm: { category: 'length', symbol: 'cm', name: 'Centimeters', ratio: 0.01 },
  m: { category: 'length', symbol: 'm', name: 'Meters', ratio: 1 },
  meter: { category: 'length', symbol: 'm', name: 'Meters', ratio: 1 },
  meters: { category: 'length', symbol: 'm', name: 'Meters', ratio: 1 },
  km: { category: 'length', symbol: 'km', name: 'Kilometers', ratio: 1000 },
  in: { category: 'length', symbol: 'in', name: 'Inches', ratio: 0.0254 },
  inch: { category: 'length', symbol: 'in', name: 'Inches', ratio: 0.0254 },
  inches: { category: 'length', symbol: 'in', name: 'Inches', ratio: 0.0254 },
  ft: { category: 'length', symbol: 'ft', name: 'Feet', ratio: 0.3048 },
  feet: { category: 'length', symbol: 'ft', name: 'Feet', ratio: 0.3048 },
  foot: { category: 'length', symbol: 'ft', name: 'Feet', ratio: 0.3048 },
  yd: { category: 'length', symbol: 'yd', name: 'Yards', ratio: 0.9144 },
  yard: { category: 'length', symbol: 'yd', name: 'Yards', ratio: 0.9144 },
  yards: { category: 'length', symbol: 'yd', name: 'Yards', ratio: 0.9144 },
  mi: { category: 'length', symbol: 'mi', name: 'Miles', ratio: 1609.344 },
  mile: { category: 'length', symbol: 'mi', name: 'Miles', ratio: 1609.344 },
  miles: { category: 'length', symbol: 'mi', name: 'Miles', ratio: 1609.344 },

  // Area (base: m²)
  mm2: {
    category: 'area',
    symbol: 'mm²',
    name: 'Square Millimeters',
    ratio: 1e-6,
  },
  'mm²': {
    category: 'area',
    symbol: 'mm²',
    name: 'Square Millimeters',
    ratio: 1e-6,
  },
  cm2: {
    category: 'area',
    symbol: 'cm²',
    name: 'Square Centimeters',
    ratio: 1e-4,
  },
  'cm²': {
    category: 'area',
    symbol: 'cm²',
    name: 'Square Centimeters',
    ratio: 1e-4,
  },
  m2: { category: 'area', symbol: 'm²', name: 'Square Meters', ratio: 1 },
  'm²': { category: 'area', symbol: 'm²', name: 'Square Meters', ratio: 1 },
  sqm: { category: 'area', symbol: 'm²', name: 'Square Meters', ratio: 1 },
  km2: {
    category: 'area',
    symbol: 'km²',
    name: 'Square Kilometers',
    ratio: 1e6,
  },
  'km²': {
    category: 'area',
    symbol: 'km²',
    name: 'Square Kilometers',
    ratio: 1e6,
  },
  in2: {
    category: 'area',
    symbol: 'in²',
    name: 'Square Inches',
    ratio: 0.00064516,
  },
  'in²': {
    category: 'area',
    symbol: 'in²',
    name: 'Square Inches',
    ratio: 0.00064516,
  },
  ft2: {
    category: 'area',
    symbol: 'ft²',
    name: 'Square Feet',
    ratio: 0.09290304,
  },
  'ft²': {
    category: 'area',
    symbol: 'ft²',
    name: 'Square Feet',
    ratio: 0.09290304,
  },
  sqft: {
    category: 'area',
    symbol: 'ft²',
    name: 'Square Feet',
    ratio: 0.09290304,
  },
  ha: { category: 'area', symbol: 'ha', name: 'Hectares', ratio: 10000 },
  hectare: { category: 'area', symbol: 'ha', name: 'Hectares', ratio: 10000 },
  acre: {
    category: 'area',
    symbol: 'acre',
    name: 'Acres',
    ratio: 4046.8564224,
  },
  acres: {
    category: 'area',
    symbol: 'acre',
    name: 'Acres',
    ratio: 4046.8564224,
  },

  // Volume (base: L)
  ml: { category: 'volume', symbol: 'mL', name: 'Milliliters', ratio: 0.001 },
  mL: { category: 'volume', symbol: 'mL', name: 'Milliliters', ratio: 0.001 },
  l: { category: 'volume', symbol: 'L', name: 'Liters', ratio: 1 },
  L: { category: 'volume', symbol: 'L', name: 'Liters', ratio: 1 },
  liter: { category: 'volume', symbol: 'L', name: 'Liters', ratio: 1 },
  liters: { category: 'volume', symbol: 'L', name: 'Liters', ratio: 1 },
  m3: { category: 'volume', symbol: 'm³', name: 'Cubic Meters', ratio: 1000 },
  'm³': { category: 'volume', symbol: 'm³', name: 'Cubic Meters', ratio: 1000 },
  gal: {
    category: 'volume',
    symbol: 'gal',
    name: 'Gallons (US)',
    ratio: 3.785411784,
  },
  gallon: {
    category: 'volume',
    symbol: 'gal',
    name: 'Gallons (US)',
    ratio: 3.785411784,
  },
  gallons: {
    category: 'volume',
    symbol: 'gal',
    name: 'Gallons (US)',
    ratio: 3.785411784,
  },
  qt: {
    category: 'volume',
    symbol: 'qt',
    name: 'Quarts (US)',
    ratio: 0.946352946,
  },
  pt: {
    category: 'volume',
    symbol: 'pt',
    name: 'Pints (US)',
    ratio: 0.473176473,
  },
  floz: {
    category: 'volume',
    symbol: 'fl oz',
    name: 'Fluid Ounces (US)',
    ratio: 0.02957352956,
  },

  // Mass (base: kg)
  mg: { category: 'mass', symbol: 'mg', name: 'Milligrams', ratio: 1e-6 },
  g: { category: 'mass', symbol: 'g', name: 'Grams', ratio: 0.001 },
  gram: { category: 'mass', symbol: 'g', name: 'Grams', ratio: 0.001 },
  grams: { category: 'mass', symbol: 'g', name: 'Grams', ratio: 0.001 },
  kg: { category: 'mass', symbol: 'kg', name: 'Kilograms', ratio: 1 },
  kilogram: { category: 'mass', symbol: 'kg', name: 'Kilograms', ratio: 1 },
  kilograms: { category: 'mass', symbol: 'kg', name: 'Kilograms', ratio: 1 },
  t: { category: 'mass', symbol: 't', name: 'Metric Tons', ratio: 1000 },
  ton: { category: 'mass', symbol: 't', name: 'Metric Tons', ratio: 1000 },
  tons: { category: 'mass', symbol: 't', name: 'Metric Tons', ratio: 1000 },
  oz: { category: 'mass', symbol: 'oz', name: 'Ounces', ratio: 0.028349523125 },
  ounce: {
    category: 'mass',
    symbol: 'oz',
    name: 'Ounces',
    ratio: 0.028349523125,
  },
  lb: { category: 'mass', symbol: 'lb', name: 'Pounds', ratio: 0.45359237 },
  lbs: { category: 'mass', symbol: 'lb', name: 'Pounds', ratio: 0.45359237 },
  pound: { category: 'mass', symbol: 'lb', name: 'Pounds', ratio: 0.45359237 },
  pounds: { category: 'mass', symbol: 'lb', name: 'Pounds', ratio: 0.45359237 },

  // Temperature (base: °C)
  c: {
    category: 'temperature',
    symbol: '°C',
    name: 'Celsius',
    toBase: (v) => v,
    fromBase: (v) => v,
  },
  C: {
    category: 'temperature',
    symbol: '°C',
    name: 'Celsius',
    toBase: (v) => v,
    fromBase: (v) => v,
  },
  '°C': {
    category: 'temperature',
    symbol: '°C',
    name: 'Celsius',
    toBase: (v) => v,
    fromBase: (v) => v,
  },
  '°c': {
    category: 'temperature',
    symbol: '°C',
    name: 'Celsius',
    toBase: (v) => v,
    fromBase: (v) => v,
  },
  celsius: {
    category: 'temperature',
    symbol: '°C',
    name: 'Celsius',
    toBase: (v) => v,
    fromBase: (v) => v,
  },
  f: {
    category: 'temperature',
    symbol: '°F',
    name: 'Fahrenheit',
    toBase: (v) => ((v - 32) * 5) / 9,
    fromBase: (v) => (v * 9) / 5 + 32,
  },
  F: {
    category: 'temperature',
    symbol: '°F',
    name: 'Fahrenheit',
    toBase: (v) => ((v - 32) * 5) / 9,
    fromBase: (v) => (v * 9) / 5 + 32,
  },
  '°F': {
    category: 'temperature',
    symbol: '°F',
    name: 'Fahrenheit',
    toBase: (v) => ((v - 32) * 5) / 9,
    fromBase: (v) => (v * 9) / 5 + 32,
  },
  '°f': {
    category: 'temperature',
    symbol: '°F',
    name: 'Fahrenheit',
    toBase: (v) => ((v - 32) * 5) / 9,
    fromBase: (v) => (v * 9) / 5 + 32,
  },
  fahrenheit: {
    category: 'temperature',
    symbol: '°F',
    name: 'Fahrenheit',
    toBase: (v) => ((v - 32) * 5) / 9,
    fromBase: (v) => (v * 9) / 5 + 32,
  },
  k: {
    category: 'temperature',
    symbol: 'K',
    name: 'Kelvin',
    toBase: (v) => v - 273.15,
    fromBase: (v) => v + 273.15,
  },
  K: {
    category: 'temperature',
    symbol: 'K',
    name: 'Kelvin',
    toBase: (v) => v - 273.15,
    fromBase: (v) => v + 273.15,
  },
  kelvin: {
    category: 'temperature',
    symbol: 'K',
    name: 'Kelvin',
    toBase: (v) => v - 273.15,
    fromBase: (v) => v + 273.15,
  },

  // Pressure (base: Pa)
  pa: { category: 'pressure', symbol: 'Pa', name: 'Pascals', ratio: 1 },
  Pa: { category: 'pressure', symbol: 'Pa', name: 'Pascals', ratio: 1 },
  kpa: {
    category: 'pressure',
    symbol: 'kPa',
    name: 'Kilopascals',
    ratio: 1000,
  },
  kPa: {
    category: 'pressure',
    symbol: 'kPa',
    name: 'Kilopascals',
    ratio: 1000,
  },
  mPa: {
    category: 'pressure',
    symbol: 'mPa',
    name: 'Millipascals',
    ratio: 0.001,
  },
  MPa: {
    category: 'pressure',
    symbol: 'MPa',
    name: 'Megapascals',
    ratio: 1e6,
  },
  bar: { category: 'pressure', symbol: 'bar', name: 'Bars', ratio: 100000 },
  psi: {
    category: 'pressure',
    symbol: 'psi',
    name: 'Pounds per sq inch',
    ratio: 6894.75729,
  },
  atm: {
    category: 'pressure',
    symbol: 'atm',
    name: 'Atmospheres',
    ratio: 101325,
  },
  torr: {
    category: 'pressure',
    symbol: 'Torr',
    name: 'Torr',
    ratio: 101325 / 760,
  },
  mmhg: {
    category: 'pressure',
    symbol: 'mmHg',
    name: 'Millimeters of Mercury',
    ratio: 133.322387415,
  },
  mmHg: {
    category: 'pressure',
    symbol: 'mmHg',
    name: 'Millimeters of Mercury',
    ratio: 133.322387415,
  },
  mb: {
    category: 'pressure',
    symbol: 'mbar',
    name: 'Millibars',
    ratio: 100,
  },
  mbar: {
    category: 'pressure',
    symbol: 'mbar',
    name: 'Millibars',
    ratio: 100,
  },

  // Energy (base: J)
  j: { category: 'energy', symbol: 'J', name: 'Joules', ratio: 1 },
  J: { category: 'energy', symbol: 'J', name: 'Joules', ratio: 1 },
  kj: { category: 'energy', symbol: 'kJ', name: 'Kilojoules', ratio: 1000 },
  cal: { category: 'energy', symbol: 'cal', name: 'Calories', ratio: 4.184 },
  kcal: {
    category: 'energy',
    symbol: 'kcal',
    name: 'Kilocalories',
    ratio: 4184,
  },
  wh: { category: 'energy', symbol: 'Wh', name: 'Watt-hours', ratio: 3600 },
  kwh: {
    category: 'energy',
    symbol: 'kWh',
    name: 'Kilowatt-hours',
    ratio: 3.6e6,
  },
  btu: {
    category: 'energy',
    symbol: 'BTU',
    name: 'British Thermal Units',
    ratio: 1055.05585,
  },

  // Data Size (base: B; byte units retain binary powers)
  B: { category: 'datasize', symbol: 'B', name: 'Bytes', ratio: 1 },
  byte: { category: 'datasize', symbol: 'B', name: 'Bytes', ratio: 1 },
  bytes: { category: 'datasize', symbol: 'B', name: 'Bytes', ratio: 1 },
  b: { category: 'datasize', symbol: 'b', name: 'Bits', ratio: 1 / 8 },
  KB: {
    category: 'datasize',
    symbol: 'KB',
    name: 'Kilobytes',
    ratio: 1024,
  },
  kb: {
    category: 'datasize',
    symbol: 'KB',
    name: 'Kilobytes',
    ratio: 1024,
  },
  MB: {
    category: 'datasize',
    symbol: 'MB',
    name: 'Megabytes',
    ratio: 1024 ** 2,
  },
  GB: {
    category: 'datasize',
    symbol: 'GB',
    name: 'Gigabytes',
    ratio: 1024 ** 3,
  },
  gb: {
    category: 'datasize',
    symbol: 'GB',
    name: 'Gigabytes',
    ratio: 1024 ** 3,
  },
  TB: {
    category: 'datasize',
    symbol: 'TB',
    name: 'Terabytes',
    ratio: 1024 ** 4,
  },
  tb: {
    category: 'datasize',
    symbol: 'TB',
    name: 'Terabytes',
    ratio: 1024 ** 4,
  },
  Kb: {
    category: 'datasize',
    symbol: 'Kb',
    name: 'Kilobits',
    ratio: 1000 / 8,
  },
  Mb: {
    category: 'datasize',
    symbol: 'Mb',
    name: 'Megabits',
    ratio: 1e6 / 8,
  },
  Gb: {
    category: 'datasize',
    symbol: 'Gb',
    name: 'Gigabits',
    ratio: 1e9 / 8,
  },
  Tb: {
    category: 'datasize',
    symbol: 'Tb',
    name: 'Terabits',
    ratio: 1e12 / 8,
  },

  // Data Rate (base: bps)
  bps: {
    category: 'datarate',
    symbol: 'bps',
    name: 'Bits per second',
    ratio: 1,
  },
  kbps: {
    category: 'datarate',
    symbol: 'Kbps',
    name: 'Kilobits per second',
    ratio: 1000,
  },
  mbps: {
    category: 'datarate',
    symbol: 'Mbps',
    name: 'Megabits per second',
    ratio: 1e6,
  },
  gbps: {
    category: 'datarate',
    symbol: 'Gbps',
    name: 'Gigabits per second',
    ratio: 1e9,
  },

  // Duration (base: s)
  ms: {
    category: 'duration',
    symbol: 'ms',
    name: 'Milliseconds',
    ratio: 0.001,
  },
  s: { category: 'duration', symbol: 's', name: 'Seconds', ratio: 1 },
  sec: { category: 'duration', symbol: 's', name: 'Seconds', ratio: 1 },
  second: { category: 'duration', symbol: 's', name: 'Seconds', ratio: 1 },
  seconds: { category: 'duration', symbol: 's', name: 'Seconds', ratio: 1 },
  min: { category: 'duration', symbol: 'min', name: 'Minutes', ratio: 60 },
  minute: { category: 'duration', symbol: 'min', name: 'Minutes', ratio: 60 },
  minutes: { category: 'duration', symbol: 'min', name: 'Minutes', ratio: 60 },
  h: { category: 'duration', symbol: 'h', name: 'Hours', ratio: 3600 },
  hr: { category: 'duration', symbol: 'h', name: 'Hours', ratio: 3600 },
  hour: { category: 'duration', symbol: 'h', name: 'Hours', ratio: 3600 },
  hours: { category: 'duration', symbol: 'h', name: 'Hours', ratio: 3600 },
  d: { category: 'duration', symbol: 'd', name: 'Days', ratio: 86400 },
  day: { category: 'duration', symbol: 'd', name: 'Days', ratio: 86400 },
  days: { category: 'duration', symbol: 'd', name: 'Days', ratio: 86400 },
};

function addSharedUnits(
  definitions: readonly SharedUnitDefinition[],
  category: 'power' | 'speed',
): void {
  for (const definition of definitions) {
    const unit: UnitDef = {
      category,
      symbol: definition.symbol,
      name: definition.name,
      ratio: definition.factor,
    };
    UNITS[definition.symbol] = unit;
    for (const alias of definition.aliases) UNITS[alias] = unit;
  }
}

addSharedUnits(POWER_UNIT_DEFINITIONS, 'power');
addSharedUnits(SPEED_UNIT_DEFINITIONS, 'speed');

const FOLDED_UNITS = new Map<string, UnitDef | null>();
for (const [key, definition] of Object.entries(UNITS)) {
  const foldedKey = key.toLowerCase();
  const existing = FOLDED_UNITS.get(foldedKey);
  if (existing === undefined) {
    FOLDED_UNITS.set(foldedKey, definition);
  } else if (
    existing === null ||
    existing.category !== definition.category ||
    existing.symbol !== definition.symbol
  ) {
    FOLDED_UNITS.set(foldedKey, null);
  }
}

function resolveUnit(raw: string): UnitDef | null {
  if (Object.hasOwn(UNITS, raw)) return UNITS[raw];
  if (raw.length === 1 && raw !== raw.toLowerCase()) return null;
  return FOLDED_UNITS.get(raw.toLowerCase()) ?? null;
}

// Target list of canonical units for each category
const CATEGORY_DISPLAY_UNITS: Record<UnitCategory, string[]> = {
  length: ['km', 'm', 'cm', 'mm', 'mi', 'ft', 'in'],
  area: ['km2', 'm2', 'cm2', 'ha', 'acre', 'ft2'],
  volume: ['m3', 'l', 'ml', 'gal', 'qt', 'floz'],
  mass: ['t', 'kg', 'g', 'mg', 'lb', 'oz'],
  temperature: ['c', 'f', 'k'],
  speed: ['km/h', 'm/s', 'mph', 'kn', 'ft/s'],
  pressure: ['bar', 'MPa', 'kPa', 'mPa', 'pa', 'psi', 'atm', 'mmHg', 'mbar'],
  power: ['kW', 'W', 'mW', 'MW', 'hp', 'PS', 'BTU/h'],
  energy: ['kwh', 'j', 'kj', 'kcal', 'wh'],
  datasize: ['TB', 'GB', 'MB', 'KB', 'B', 'Tb', 'Gb', 'Mb', 'Kb', 'b'],
  datarate: ['gbps', 'mbps', 'kbps', 'bps'],
  duration: ['d', 'h', 'min', 's', 'ms'],
};

// Convert value from srcDef to dstDef
function convertValue(val: number, srcDef: UnitDef, dstDef: UnitDef): number {
  if (srcDef.category !== dstDef.category) return Number.NaN;

  if (srcDef.category === 'temperature') {
    const baseC = srcDef.toBase ? srcDef.toBase(val) : val;
    return dstDef.fromBase ? dstDef.fromBase(baseC) : baseC;
  }

  const baseVal = val * (srcDef.ratio || 1);
  return baseVal / (dstDef.ratio || 1);
}

// Regex to parse expressions like "100 km", "500 MB in GB", "37 C to F".
const UNIT_INPUT_RE = new RegExp(
  `^\\s*(${STRICT_NUMBER_TOKEN})(\\s*)([°²³a-zA-Z%/]+)(?:(?:\\s+(?:to|in)\\s+|\\s*(?:->|=|:)\\s*)([°²³a-zA-Z%/]+))?\\s*$`,
  'i',
);
const MAX_UNIT_INPUT_LENGTH = 64;

interface ParsedUnitInput {
  value: number;
  source: string;
  target: string | null;
  hasSeparator: boolean;
}

function parseUnitInput(raw: string): ParsedUnitInput | null {
  if (raw.length > MAX_UNIT_INPUT_LENGTH) return null;
  const match = UNIT_INPUT_RE.exec(raw);
  if (!match) return null;

  const value = parseStrictNumber(match[1]);
  if (value === null) return null;

  return {
    value,
    source: match[3],
    target: match[4] ?? null,
    hasSeparator: match[2].length > 0,
  };
}

function requiresUnitSeparator(unit: string): boolean {
  return unit.length === 1 && /^[a-zA-Z]$/.test(unit);
}

function isBelowAbsoluteZero(value: number, definition: UnitDef): boolean {
  if (definition.category !== 'temperature') return false;

  const minimum =
    definition.symbol === 'K'
      ? 0
      : definition.symbol === '°F'
        ? -459.67
        : -273.15;
  return value < minimum;
}

export const UnitConverterBoxSource = {
  defaultDisabled: false,
  name: 'Unit Converter',
  description:
    'Convert units automatically for length, area, volume, mass, temperature, speed, pressure, power, energy, data size, data rate, and time (e.g. 100 km, 50 MB to GB, 37 C).',
  defaultInput: '100 km to mi',
  tag: '⇄',
  kind: 'Convert',

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const optionTriggered = hasOptionKeys(options, 'unit', 'convert');
    const trimmedInput = trim(input);

    let parsed: ParsedUnitInput | null = parseUnitInput(trimmedInput);
    if (!parsed && optionTriggered) {
      const optVal = extractOptionKeys(options, 'unit', 'convert');
      const optStr = typeof optVal === 'string' ? optVal : trimmedInput;
      parsed = parseUnitInput(optStr);
    }
    if (!parsed) return [];

    const { source: srcUnitRaw, target: dstUnitRaw, value: numVal } = parsed;
    if (
      !optionTriggered &&
      !parsed.hasSeparator &&
      requiresUnitSeparator(srcUnitRaw)
    ) {
      return [];
    }

    const srcDef = resolveUnit(srcUnitRaw);
    if (!srcDef) return [];

    if (isBelowAbsoluteZero(numVal, srcDef)) return [];

    const category = srcDef.category;
    const categoryUnits = CATEGORY_DISPLAY_UNITS[category];

    const kvOptions: Record<string, string> = {
      Input: `${formatConversionValue(numVal)} ${srcDef.symbol}`,
    };

    let targetDef: UnitDef | null = null;
    if (dstUnitRaw) {
      targetDef = resolveUnit(dstUnitRaw);
      if (!targetDef) {
        kvOptions.Error = `Unknown target unit: "${dstUnitRaw}"`;
      } else if (targetDef.category !== category) {
        kvOptions.Error = `Target unit "${dstUnitRaw}" is incompatible with ${category}`;
      } else {
        const converted = convertValue(numVal, srcDef, targetDef);
        kvOptions[`Target (${targetDef.name})`] =
          `${formatConversionValue(converted)} ${targetDef.symbol}`;
      }
    }

    const title = `Unit Converter (${srcDef.category.toUpperCase()})`;
    if (kvOptions.Error) {
      const plaintext = Object.entries(kvOptions)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n');
      return [
        new BoxBuilder(title, plaintext)
          .setView('keyValue')
          .setOptions(kvOptions)

          .build(),
      ];
    }

    // Add list of conversions to other canonical units in same category
    const skippedSymbols = new Set([srcDef.symbol]);
    if (targetDef) skippedSymbols.add(targetDef.symbol);
    for (const key of categoryUnits) {
      const dstDef = UNITS[key];
      if (dstDef && !skippedSymbols.has(dstDef.symbol)) {
        const converted = convertValue(numVal, srcDef, dstDef);
        kvOptions[dstDef.name] =
          `${formatConversionValue(converted)} ${dstDef.symbol}`;
      }
    }

    const plaintext = Object.entries(kvOptions)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    return [
      new BoxBuilder(title, plaintext)
        .setView('keyValue')
        .setOptions(kvOptions)

        .build(),
    ];
  },
};

export default UnitConverterBoxSource;
