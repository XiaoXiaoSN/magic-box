import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// unit aliases (normalized) → liters
const TO_L: Record<string, number> = {
  l: 1,
  ml: 0.001,
  cl: 0.01,
  dl: 0.1,
  kl: 1000,
  m3: 1000,
  cm3: 0.001,
  mm3: 1e-6,
  dm3: 1,
  ft3: 28.316846592,
  in3: 0.016387064,
  yd3: 764.554857984,
  usgal: 3.785411784,
  gal: 3.785411784,
  impgal: 4.54609,
  usqt: 0.946352946,
  uspt: 0.473176473,
};

const SUPPORTED_UNITS = Object.keys(TO_L).join(', ');

// max input length to prevent abuse
const MAX_INPUT_LENGTH = 64;

// formats the value as an integer string when exact, or 6-decimal trimmed float
function formatValue(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return String(Number.parseFloat(n.toFixed(6)));
}

// builds the plaintext kv string for KeyValueBoxTemplate
function kvToPlaintext(kv: Record<string, string>): string {
  return Object.entries(kv)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

// normalizes a unit string: lowercase, ³→3, ^3→3, collapse whitespace
function normalizeUnit(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/³/g, '3')
    .replace(/\^3/g, '3')
    .replace(/\s+/g, '');
}

export const MetricVolumeBoxSource = {
  name: 'Volume Convert',
  description: 'Convert a volume between m³, L, mL, ft³, gallons, and more.',
  defaultInput: '1 m3 ::cubicvolume',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'cubicvolume', 'volumeconvert')) return [];

    const raw = trim(input);
    if (!raw || raw.length > MAX_INPUT_LENGTH) return [];

    // expect "<number> <unit>", split on first whitespace boundary
    const spaceIdx = raw.search(/\s+/);
    if (spaceIdx === -1) {
      return [buildErrorBox()];
    }

    const numStr = raw.slice(0, spaceIdx);
    const unitRaw = raw.slice(spaceIdx).trim();

    const value = Number.parseFloat(numStr);
    if (Number.isNaN(value)) {
      return [buildErrorBox()];
    }

    const unit = normalizeUnit(unitRaw);
    const factor = TO_L[unit];
    if (factor === undefined) {
      return [buildErrorBox()];
    }

    const liters = value * factor;

    const kv: Record<string, string> = {
      Input: `${formatValue(value)} ${unitRaw}`,
      L: formatValue(liters),
      mL: formatValue(liters * 1000),
      'm³': formatValue(liters / 1000),
      'cm³': formatValue(liters * 1000),
      'ft³': formatValue(liters / 28.316846592),
      'in³': formatValue(liters / 0.016387064),
      'US gal': formatValue(liters / 3.785411784),
      'imp gal': formatValue(liters / 4.54609),
    };

    return [
      new BoxBuilder('Volume Convert', kvToPlaintext(kv))
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(kv)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

function buildErrorBox(): Box {
  const kv = {
    Error: 'Invalid input. Expected: <number> <unit>',
    Supported: SUPPORTED_UNITS,
  };
  return new BoxBuilder('Volume Convert', kvToPlaintext(kv))
    .setTemplate(KeyValueBoxTemplate)
    .setOptions(kv)
    .setPriority(Priority)
    .build();
}

export default MetricVolumeBoxSource;
