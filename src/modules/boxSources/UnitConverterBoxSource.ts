import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys, hasOptionKeys } from '@modules/Box';

const Priority = 12;

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
  l: { category: 'volume', symbol: 'L', name: 'Liters', ratio: 1 },
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
  t: { category: 'mass', symbol: 't', name: 'Metric Tons', ratio: 1000 },
  ton: { category: 'mass', symbol: 't', name: 'Metric Tons', ratio: 1000 },
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

  // Temperature (base: °C)
  c: {
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
  kelvin: {
    category: 'temperature',
    symbol: 'K',
    name: 'Kelvin',
    toBase: (v) => v - 273.15,
    fromBase: (v) => v + 273.15,
  },

  // Speed (base: m/s)
  'm/s': {
    category: 'speed',
    symbol: 'm/s',
    name: 'Meters per second',
    ratio: 1,
  },
  'km/h': {
    category: 'speed',
    symbol: 'km/h',
    name: 'Kilometers per hour',
    ratio: 1 / 3.6,
  },
  kph: {
    category: 'speed',
    symbol: 'km/h',
    name: 'Kilometers per hour',
    ratio: 1 / 3.6,
  },
  mph: {
    category: 'speed',
    symbol: 'mph',
    name: 'Miles per hour',
    ratio: 0.44704,
  },
  kn: { category: 'speed', symbol: 'kn', name: 'Knots', ratio: 0.514444 },
  knot: { category: 'speed', symbol: 'kn', name: 'Knots', ratio: 0.514444 },
  knots: { category: 'speed', symbol: 'kn', name: 'Knots', ratio: 0.514444 },

  // Pressure (base: Pa)
  pa: { category: 'pressure', symbol: 'Pa', name: 'Pascals', ratio: 1 },
  kpa: {
    category: 'pressure',
    symbol: 'kPa',
    name: 'Kilopascals',
    ratio: 1000,
  },
  mpa: { category: 'pressure', symbol: 'MPa', name: 'Megapascals', ratio: 1e6 },
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
    ratio: 133.322368,
  },
  mmhg: {
    category: 'pressure',
    symbol: 'mmHg',
    name: 'Millimeters of Mercury',
    ratio: 133.322368,
  },

  // Power (base: W)
  w: { category: 'power', symbol: 'W', name: 'Watts', ratio: 1 },
  kw: { category: 'power', symbol: 'kW', name: 'Kilowatts', ratio: 1000 },
  mw: { category: 'power', symbol: 'MW', name: 'Megawatts', ratio: 1e6 },
  hp: {
    category: 'power',
    symbol: 'hp',
    name: 'Horsepower',
    ratio: 745.699872,
  },

  // Energy (base: J)
  j: { category: 'energy', symbol: 'J', name: 'Joules', ratio: 1 },
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

  // Data Size (base: B)
  b: { category: 'datasize', symbol: 'B', name: 'Bytes', ratio: 1 },
  bytes: { category: 'datasize', symbol: 'B', name: 'Bytes', ratio: 1 },
  kb: { category: 'datasize', symbol: 'KB', name: 'Kilobytes', ratio: 1024 },
  mb: {
    category: 'datasize',
    symbol: 'MB',
    name: 'Megabytes',
    ratio: 1024 ** 2,
  },
  gb: {
    category: 'datasize',
    symbol: 'GB',
    name: 'Gigabytes',
    ratio: 1024 ** 3,
  },
  tb: {
    category: 'datasize',
    symbol: 'TB',
    name: 'Terabytes',
    ratio: 1024 ** 4,
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
  seconds: { category: 'duration', symbol: 's', name: 'Seconds', ratio: 1 },
  min: { category: 'duration', symbol: 'min', name: 'Minutes', ratio: 60 },
  minutes: { category: 'duration', symbol: 'min', name: 'Minutes', ratio: 60 },
  h: { category: 'duration', symbol: 'h', name: 'Hours', ratio: 3600 },
  hr: { category: 'duration', symbol: 'h', name: 'Hours', ratio: 3600 },
  hours: { category: 'duration', symbol: 'h', name: 'Hours', ratio: 3600 },
  d: { category: 'duration', symbol: 'd', name: 'Days', ratio: 86400 },
  days: { category: 'duration', symbol: 'd', name: 'Days', ratio: 86400 },
};

// Target list of canonical units for each category
const CATEGORY_DISPLAY_UNITS: Record<UnitCategory, string[]> = {
  length: ['km', 'm', 'cm', 'mm', 'mi', 'ft', 'in'],
  area: ['km2', 'm2', 'cm2', 'ha', 'acre', 'ft2'],
  volume: ['m3', 'l', 'ml', 'gal', 'qt', 'floz'],
  mass: ['t', 'kg', 'g', 'mg', 'lb', 'oz'],
  temperature: ['c', 'f', 'k'],
  speed: ['km/h', 'm/s', 'mph', 'kn'],
  pressure: ['bar', 'kpa', 'pa', 'psi', 'atm'],
  power: ['kw', 'w', 'hp', 'mw'],
  energy: ['kwh', 'j', 'kj', 'kcal', 'wh'],
  datasize: ['tb', 'gb', 'mb', 'kb', 'b'],
  datarate: ['gbps', 'mbps', 'kbps', 'bps'],
  duration: ['d', 'h', 'min', 's', 'ms'],
};

// Format numeric output nicely (smart precision)
function formatVal(val: number): string {
  if (Math.abs(val) >= 1e9 || (Math.abs(val) < 1e-4 && val !== 0)) {
    return val.toExponential(4);
  }
  const str = val.toLocaleString('en-US', {
    maximumFractionDigits: 6,
  });
  return str;
}

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

// Regex to parse expressions like "100 km", "500 MB in GB", "37 C to F"
const UNIT_INPUT_RE =
  /^\s*([+-]?[\d,._]+(?:e[+-]?\d+)?)\s*([°²³a-zA-Z%/]+)(?:\s*(?:to|in|->|=|:)\s*([°²³a-zA-Z%/]+))?\s*$/i;

export const UnitConverterBoxSource = {
  defaultDisabled: false,
  name: 'Unit Converter',
  description:
    'Convert units automatically for length, area, volume, mass, temperature, speed, pressure, power, energy, data size, data rate, and time (e.g. 100 km, 50 MB to GB, 37 C).',
  defaultInput: '100 km to mi',
  tag: 'Unit',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const optionTriggered = hasOptionKeys(options, 'unit', 'convert');
    const trimmedInput = trim(input);

    const match = UNIT_INPUT_RE.exec(trimmedInput);
    if (!match && !optionTriggered) return [];

    let numVal: number;
    let srcUnitRaw: string;
    let dstUnitRaw: string | null = null;

    if (match) {
      const rawNumStr = match[1].replace(/[,_]/g, '');
      numVal = Number.parseFloat(rawNumStr);
      srcUnitRaw = match[2].toLowerCase();
      dstUnitRaw = match[3] ? match[3].toLowerCase() : null;
    } else if (optionTriggered) {
      const optVal = extractOptionKeys(options, 'unit', 'convert');
      const optStr = typeof optVal === 'string' ? optVal : trimmedInput;
      const optMatch = UNIT_INPUT_RE.exec(optStr);
      if (!optMatch) return [];
      numVal = Number.parseFloat(optMatch[1].replace(/[,_]/g, ''));
      srcUnitRaw = optMatch[2].toLowerCase();
      dstUnitRaw = optMatch[3] ? optMatch[3].toLowerCase() : null;
    } else {
      return [];
    }

    if (Number.isNaN(numVal)) return [];

    const srcDef = UNITS[srcUnitRaw];
    if (!srcDef) return [];

    const category = srcDef.category;
    const categoryUnits = CATEGORY_DISPLAY_UNITS[category];

    const kvOptions: Record<string, string> = {
      Input: `${formatVal(numVal)} ${srcDef.symbol}`,
    };

    if (dstUnitRaw) {
      const dstDef = UNITS[dstUnitRaw];
      if (dstDef && dstDef.category === category) {
        const converted = convertValue(numVal, srcDef, dstDef);
        kvOptions[`Target (${dstDef.name})`] =
          `${formatVal(converted)} ${dstDef.symbol}`;
      }
    }

    // Add list of conversions to other canonical units in same category
    for (const key of categoryUnits) {
      const dstDef = UNITS[key];
      if (dstDef && dstDef.symbol !== srcDef.symbol) {
        const converted = convertValue(numVal, srcDef, dstDef);
        kvOptions[dstDef.name] = `${formatVal(converted)} ${dstDef.symbol}`;
      }
    }

    const title = `Unit Converter (${srcDef.category.toUpperCase()})`;
    const plaintext = Object.entries(kvOptions)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    return [
      new BoxBuilder(title, plaintext)
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(kvOptions)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default UnitConverterBoxSource;
