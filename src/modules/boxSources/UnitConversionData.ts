export interface SharedUnitDefinition {
  readonly symbol: string;
  readonly outputSymbol?: string;
  readonly name: string;
  readonly factor: number;
  readonly aliases: readonly string[];
}

export const POWER_UNIT_DEFINITIONS: readonly SharedUnitDefinition[] = [
  { symbol: 'W', name: 'Watts', factor: 1, aliases: ['w'] },
  { symbol: 'kW', name: 'Kilowatts', factor: 1000, aliases: ['kw'] },
  { symbol: 'mW', name: 'Milliwatts', factor: 1e-3, aliases: [] },
  { symbol: 'MW', name: 'Megawatts', factor: 1e6, aliases: [] },
  {
    symbol: 'hp',
    name: 'Horsepower',
    factor: 745.699872,
    aliases: [],
  },
  {
    symbol: 'PS',
    name: 'Metric horsepower',
    factor: 735.49875,
    aliases: ['ps'],
  },
  {
    symbol: 'BTU/h',
    name: 'British thermal units per hour',
    factor: 0.29307107017,
    aliases: ['btu/h', 'btuh'],
  },
];

export const SPEED_UNIT_DEFINITIONS: readonly SharedUnitDefinition[] = [
  { symbol: 'm/s', name: 'Meters per second', factor: 1, aliases: ['mps'] },
  {
    symbol: 'km/h',
    name: 'Kilometers per hour',
    factor: 1000 / 3600,
    aliases: ['kmh', 'kph'],
  },
  {
    symbol: 'mph',
    name: 'Miles per hour',
    factor: 1609.344 / 3600,
    aliases: [],
  },
  {
    symbol: 'kn',
    outputSymbol: 'knot',
    name: 'Knots',
    factor: 1852 / 3600,
    aliases: ['knot', 'knots'],
  },
  { symbol: 'ft/s', name: 'Feet per second', factor: 0.3048, aliases: ['fps'] },
];

export const STRICT_NUMBER_TOKEN =
  '[+-]?(?:(?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d+)?|\\.\\d+)(?:e[+-]?\\d+)?';

const GROUPED_NUMBER_RE = /^[+-]?\d{1,3}(?:,\d{3})+(?:\.\d+)?(?:e[+-]?\d+)?$/i;
const DECIMAL_NUMBER_RE = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?$/i;

export function parseStrictNumber(raw: string): number | null {
  const normalized = GROUPED_NUMBER_RE.test(raw)
    ? raw.replace(/,/g, '')
    : DECIMAL_NUMBER_RE.test(raw)
      ? raw
      : null;

  if (normalized === null) return null;
  const value = Number(normalized);
  const exponentIndex = normalized.search(/e/i);
  const mantissa =
    exponentIndex === -1 ? normalized : normalized.slice(0, exponentIndex);
  if (value === 0 && /[1-9]/.test(mantissa)) return null;
  return Number.isFinite(value) ? value : null;
}

export function formatConversionValue(value: number): string {
  if (!Number.isFinite(value)) return String(value);
  if (Object.is(value, -0)) return '0';
  if (Number.isSafeInteger(value)) return value.toLocaleString('en-US');

  const absolute = Math.abs(value);
  if (absolute > 0 && absolute < 1e-4) {
    return String(Number.parseFloat(value.toPrecision(6)));
  }

  return value.toLocaleString('en-US', { maximumFractionDigits: 6 });
}

export interface UnitLookup<T> {
  readonly exact: ReadonlyMap<string, T>;
  readonly folded: ReadonlyMap<string, T | null>;
}

export function createUnitLookup<
  T extends { aliases: readonly string[]; symbol: string },
>(definitions: readonly T[]): UnitLookup<T> {
  const exact = new Map<string, T>();
  const folded = new Map<string, T | null>();

  for (const definition of definitions) {
    exact.set(definition.symbol, definition);
    for (const alias of definition.aliases) exact.set(alias, definition);

    for (const key of [definition.symbol, ...definition.aliases]) {
      const foldedKey = key.toLowerCase();
      const existing = folded.get(foldedKey);
      if (existing === undefined) {
        folded.set(foldedKey, definition);
      } else if (existing !== definition) {
        folded.set(foldedKey, null);
      }
    }
  }

  return { exact, folded };
}

export function resolveUnit<T>(lookup: UnitLookup<T>, raw: string): T | null {
  const exact = lookup.exact.get(raw);
  if (exact !== undefined) return exact;

  // a one-letter uppercase SI symbol must never fall back to a lowercase unit.
  if (raw.length === 1 && raw !== raw.toLowerCase()) return null;

  return lookup.folded.get(raw.toLowerCase()) ?? null;
}
