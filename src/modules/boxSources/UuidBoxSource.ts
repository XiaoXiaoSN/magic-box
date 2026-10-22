import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, errorBox, extractOptionKeys } from '@modules/Box';
import { formatIdTimestamp } from './idTime';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UUID_EPOCH_100NS = 122_192_928_000_000_000n;

type Generation = 'v4' | 'v7' | 'nil' | 'max';

interface ParsedUuid {
  kind: 'parse';
  uuid: string;
  bytes: Uint8Array;
  version: number;
  variant: string;
}

interface GeneratedUuid {
  kind: 'generate';
  generation: Generation;
}

type Match = ParsedUuid | GeneratedUuid;

function generateUuidV4(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.getRandomValues === 'function'
  ) {
    crypto.getRandomValues(bytes);
  } else {
    // preserve the legacy v4 fallback for non-secure contexts.
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return bytesToUuid(bytes);
}

function generateUuidV7(): string | null {
  if (
    typeof crypto === 'undefined' ||
    typeof crypto.getRandomValues !== 'function'
  ) {
    return null;
  }

  const timestamp = BigInt(Date.now());
  if (timestamp < 0n || timestamp >= 2n ** 48n) return null;

  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  for (let index = 5; index >= 0; index -= 1) {
    bytes[index] = Number(timestamp >> BigInt((5 - index) * 8)) & 0xff;
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return bytesToUuid(bytes);
}

function bytesToUuid(bytes: Uint8Array): string {
  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function uuidToBytes(uuid: string): Uint8Array {
  const hex = uuid.replaceAll('-', '');
  const bytes = new Uint8Array(16);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function variantFor(byte: number): string {
  if ((byte & 0x80) === 0) return 'NCS';
  if ((byte & 0xc0) === 0x80) return 'RFC 9562';
  if ((byte & 0xe0) === 0xc0) return 'Microsoft';
  return 'Future';
}

function readUuidTimestamp(bytes: Uint8Array, version: number): bigint | null {
  const variant = variantFor(bytes[8]);
  if (variant !== 'RFC 9562') return null;

  if (version === 7) {
    let milliseconds = 0n;
    for (let index = 0; index < 6; index += 1) {
      milliseconds = (milliseconds << 8n) | BigInt(bytes[index]);
    }
    return milliseconds;
  }

  if (version !== 1 && version !== 6) return null;

  let timestamp100ns: bigint;
  if (version === 1) {
    const timeLow = BigInt(
      ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0,
    );
    const timeMid = BigInt((bytes[4] << 8) | bytes[5]);
    const timeHigh = BigInt(((bytes[6] & 0x0f) << 8) | bytes[7]);
    timestamp100ns = (timeHigh << 48n) | (timeMid << 32n) | timeLow;
  } else {
    let high = 0n;
    for (let index = 0; index < 6; index += 1) {
      high = (high << 8n) | BigInt(bytes[index]);
    }
    const low = BigInt(((bytes[6] & 0x0f) << 8) | bytes[7]);
    timestamp100ns = (high << 12n) | low;
  }

  const unix100ns = timestamp100ns - UUID_EPOCH_100NS;
  return unix100ns >= 0n
    ? unix100ns / 10_000n
    : -((-unix100ns + 9_999n) / 10_000n);
}

function parseUuid(input: string): ParsedUuid | undefined {
  if (!UUID_PATTERN.test(input)) return undefined;
  const uuid = input.toLowerCase();
  const bytes = uuidToBytes(uuid);
  return {
    kind: 'parse',
    uuid,
    bytes,
    version: bytes[6] >> 4,
    variant: variantFor(bytes[8]),
  };
}

function buildParsedBox(match: ParsedUuid): Box {
  const values: Record<string, string> = {
    UUID: match.uuid,
    Version: String(match.version),
    Variant: match.variant,
  };
  const timestamp = readUuidTimestamp(match.bytes, match.version);
  if (timestamp !== null) {
    const formatted = formatIdTimestamp(timestamp);
    if (formatted !== null) {
      values.Timestamp = formatted.iso;
      values['Unix (ms)'] = formatted.unixMs;
    }
  }

  const plaintext = Object.entries(values)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
  return new BoxBuilder('UUID', plaintext)
    .setView('keyValue')
    .setOptions(values)
    .setShowExpandButton(false)

    .build();
}

function buildGeneratedBox(uuid: string, generation: Generation): Box {
  if (generation !== 'v7') {
    return new BoxBuilder('UUID', uuid)
      .setShowExpandButton(false)

      .build();
  }

  const parsed = parseUuid(uuid);
  if (parsed === undefined) {
    return errorBox('UUID', 'Generated UUID v7 was invalid.');
  }
  const values: Record<string, string> = {
    Version: String(parsed.version),
    Variant: parsed.variant,
  };
  const timestamp = readUuidTimestamp(parsed.bytes, parsed.version);
  if (timestamp !== null) {
    const formatted = formatIdTimestamp(timestamp);
    if (formatted !== null) {
      values.Timestamp = formatted.iso;
      values['Unix (ms)'] = formatted.unixMs;
    }
  }
  return new BoxBuilder('UUID', uuid)
    .setOptions(values)
    .setShowExpandButton(false)

    .build();
}

export const UuidBoxSource = {
  name: 'UUID',
  description:
    'Generate UUID v4 or v7 values, or inspect RFC 9562 version, variant, and embedded timestamps.',
  defaultInput: 'uuid',
  tag: '⚂',
  kind: 'Generate',

  checkMatch(input: string): Match | undefined {
    const raw = input.trim();
    const parsed = parseUuid(raw);
    if (parsed !== undefined) return parsed;

    const command = /^uuid(?:\s+(v4|v7|nil|max))?$/i.exec(raw);
    if (command === null) return undefined;
    return {
      kind: 'generate',
      generation: (command[1]?.toLowerCase() ?? 'v4') as Generation,
    };
  },

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const match = this.checkMatch(input);
    if (match === undefined) return [];

    if (match.kind === 'parse') {
      return [buildParsedBox(match)];
    }

    let uuid: string;
    if (match.generation === 'v4') {
      uuid = generateUuidV4();
    } else if (match.generation === 'v7') {
      let generated: string | null;
      try {
        generated = generateUuidV7();
      } catch {
        generated = null;
      }
      if (generated === null) {
        return [
          errorBox(
            'UUID',
            'UUID v7 generation requires secure Web Crypto random values.',
          ),
        ];
      }
      uuid = generated;
    } else {
      uuid =
        match.generation === 'nil'
          ? '00000000-0000-0000-0000-000000000000'
          : 'ffffffff-ffff-ffff-ffff-ffffffffffff';
    }

    if (extractOptionKeys(options, 'uppercase', 'upper')) {
      uuid = uuid.toUpperCase();
    }
    return [buildGeneratedBox(uuid, match.generation)];
  },
};

export default UuidBoxSource;
