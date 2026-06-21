import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// unit string (lowercase) -> bytes multiplier
const TO_BYTES: Record<string, number> = {
  b: 1,
  kb: 1e3,
  mb: 1e6,
  gb: 1e9,
  tb: 1e12,
  pb: 1e15,
  kib: 1024,
  mib: 1024 ** 2,
  gib: 1024 ** 3,
  tib: 1024 ** 4,
  pib: 1024 ** 5,
};

// ordered output units shown in the result box
const OUTPUT_UNITS: Array<{ label: string; divisor: number }> = [
  { label: 'Bytes', divisor: 1 },
  { label: 'KB', divisor: 1e3 },
  { label: 'MB', divisor: 1e6 },
  { label: 'GB', divisor: 1e9 },
  { label: 'TB', divisor: 1e12 },
  { label: 'KiB', divisor: 1024 },
  { label: 'MiB', divisor: 1024 ** 2 },
  { label: 'GiB', divisor: 1024 ** 3 },
  { label: 'TiB', divisor: 1024 ** 4 },
  { label: 'PB', divisor: 1e15 },
  { label: 'PiB', divisor: 1024 ** 5 },
];

// format a byte-derived value: exact integers stay exact (sig-figs would
// corrupt large byte counts like 1073741824), fractionals round to 6 decimals
function formatSigFigs(value: number): string {
  if (value === 0) return '0';
  if (Number.isInteger(value)) return value.toString();
  return Number.parseFloat(value.toFixed(6)).toString();
}

// parse "<value> <unit>" or bare "<value>" (no unit means bytes)
function parseInput(raw: string): { bytes: number } | { error: string } | null {
  const trimmed = trim(raw).slice(0, 64);
  if (!trimmed) return null;

  // bare number → treat as bytes
  const bareMatch = /^(-?\d+(?:\.\d+)?)$/.exec(trimmed);
  if (bareMatch) {
    const value = Number.parseFloat(bareMatch[1]);
    if (Number.isNaN(value)) return null;
    return { bytes: value };
  }

  const m = /^(-?\d+(?:\.\d+)?)\s*([a-z]+)$/i.exec(trimmed);
  if (!m) return null;

  const value = Number.parseFloat(m[1]);
  const unit = m[2].toLowerCase();

  if (Number.isNaN(value)) return null;

  if (!(unit in TO_BYTES)) {
    const supported = Object.keys(TO_BYTES).join(', ');
    return { error: `Unknown unit "${m[2]}". Supported units: ${supported}` };
  }

  return { bytes: value * TO_BYTES[unit] };
}

export const DataSizeConvertBoxSource = {
  name: 'Data Size',
  description:
    'Convert a data size between SI (KB, MB, GB) and IEC (KiB, MiB, GiB) units.',
  defaultInput: '1.5 GB ::datasize',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'datasize', 'bytesize')) return [];

    const parsed = parseInput(input);
    if (!parsed) return [];

    // error result: show a box explaining the problem
    if ('error' in parsed) {
      const kv: Record<string, string> = { Error: parsed.error };
      const plaintext = `Error: ${parsed.error}`;
      return [
        new BoxBuilder('Data Size', plaintext)
          .setOptions(kv)
          .setTemplate(KeyValueBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const { bytes } = parsed;
    const kv: Record<string, string> = {};

    for (const { label, divisor } of OUTPUT_UNITS) {
      kv[label] = formatSigFigs(bytes / divisor);
    }

    // if a target unit is specified (e.g. ::datasize=mib), add a Result entry
    const targetRaw = extractOptionKeys(options, 'datasize', 'bytesize');
    if (typeof targetRaw === 'string' && targetRaw.length > 0) {
      const targetUnit = targetRaw.toLowerCase();
      if (targetUnit in TO_BYTES) {
        const resultValue = bytes / TO_BYTES[targetUnit];
        kv.Result = `${formatSigFigs(resultValue)} ${targetRaw.toUpperCase()}`;
      }
    }

    // build plaintext as "Key: value" lines for headless consumers
    const plaintext = Object.entries(kv)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    return [
      new BoxBuilder('Data Size', plaintext)
        .setOptions(kv)
        .setTemplate(KeyValueBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default DataSizeConvertBoxSource;
