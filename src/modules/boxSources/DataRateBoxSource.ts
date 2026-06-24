import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// unit (normalized) -> bits per second (SI: 1 kbit = 1000 bit; bytes: 1 B = 8 bit)
const TO_BPS: Record<string, number> = {
  bps: 1,
  kbps: 1e3,
  mbps: 1e6,
  gbps: 1e9,
  tbps: 1e12,
  'b/s': 8,
  'kb/s': 8e3,
  'mb/s': 8e6,
  'gb/s': 8e9,
  'tb/s': 8e12,
  'kib/s': 8 * 1024,
  'mib/s': 8 * 1024 ** 2,
  'gib/s': 8 * 1024 ** 3,
};

// supported unit aliases for user-facing display in the error message
const SUPPORTED_UNITS = Object.keys(TO_BPS).join(', ');

// convert k:v record to plaintext lines for box plaintextOutput
function kvToPlaintext(kv: Record<string, string>): string {
  return Object.entries(kv)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

// format a bps value to a given output divisor, stripping trailing decimal noise
function formatValue(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return String(Number.parseFloat(n.toFixed(6)));
}

// normalize the raw unit string to a key present in TO_BPS
function normalizeUnit(raw: string): string {
  // lowercase and preserve '/' so 'MB/s' → 'mb/s', 'Mbps' → 'mbps'
  return raw.toLowerCase();
}

export const DataRateBoxSource = {
  defaultDisabled: true,
  name: 'Data Rate',
  description:
    'Convert a data rate between bit/s (bps/Mbps/Gbps) and byte/s (MB/s, MiB/s).',
  defaultInput: '100 Mbps ::datarate',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'datarate', 'bandwidth')) return [];

    const text = trim(input);
    if (text.length > 64) return [];

    // parse "<value> <unit>", separated by one or more spaces
    const spaceIdx = text.indexOf(' ');
    if (spaceIdx === -1) {
      return [buildErrorBox(this.priority)];
    }

    const rawValue = text.slice(0, spaceIdx);
    const rawUnit = text.slice(spaceIdx + 1).trim();

    if (!rawUnit) {
      return [buildErrorBox(this.priority)];
    }

    const value = Number.parseFloat(rawValue);
    if (Number.isNaN(value) || value < 0) {
      return [buildErrorBox(this.priority)];
    }

    const unitKey = normalizeUnit(rawUnit);
    const multiplier = TO_BPS[unitKey];
    if (multiplier === undefined) {
      return [buildErrorBox(this.priority)];
    }

    const bps = value * multiplier;

    const kv: Record<string, string> = {
      Input: `${value} ${rawUnit}`,
      bps: formatValue(bps),
      Kbps: formatValue(bps / 1e3),
      Mbps: formatValue(bps / 1e6),
      Gbps: formatValue(bps / 1e9),
      'B/s': formatValue(bps / 8),
      'KB/s': formatValue(bps / 8 / 1e3),
      'MB/s': formatValue(bps / 8 / 1e6),
      'GB/s': formatValue(bps / 8 / 1e9),
      'MiB/s': formatValue(bps / 8 / 1024 ** 2),
    };

    return [
      new BoxBuilder('Data Rate', kvToPlaintext(kv))
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(kv)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

function buildErrorBox(priority: number): Box {
  const kv: Record<string, string> = {
    'Expected input': '<value> <unit>',
    Example: '100 Mbps',
    'Supported units': SUPPORTED_UNITS,
  };
  return new BoxBuilder('Data Rate', kvToPlaintext(kv))
    .setTemplate(KeyValueBoxTemplate)
    .setOptions(kv)
    .setPriority(priority)
    .build();
}

export default DataRateBoxSource;
