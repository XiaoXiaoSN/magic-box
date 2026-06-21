import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// gregorian epoch offset in 100-ns intervals: from 1582-10-15 to 1970-01-01
const GREGORIAN_OFFSET_100NS = BigInt('122192928000000000');

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseVariant(hexChar: string): string {
  const nibble = Number.parseInt(hexChar, 16);
  // check top bits to determine variant
  if ((nibble & 0b1000) === 0) return 'NCS (0)';
  if ((nibble & 0b1100) === 0b1000) return 'RFC 4122 (variant 1)';
  if ((nibble & 0b1110) === 0b1100) return 'Microsoft (variant 2)';
  return 'Reserved';
}

// extracts the embedded 60-bit timestamp from a v1 UUID and returns an ISO string
function v1Timestamp(uuid: string): string {
  // layout: tttttttt-tttt-1ttt-... where t = time fields
  const timeLow = BigInt(`0x${uuid.slice(0, 8)}`);
  const timeMid = BigInt(`0x${uuid.slice(9, 13)}`);
  // strip the version nibble (top 4 bits of third group)
  const timeHi = BigInt(`0x${uuid.slice(15, 18)}`);

  const ts100ns = (timeHi << BigInt(48)) | (timeMid << BigInt(32)) | timeLow;

  const unixMs = Number((ts100ns - GREGORIAN_OFFSET_100NS) / BigInt(10000));
  return new Date(unixMs).toISOString();
}

export const UuidParseBoxSource = {
  name: 'UUID Parse',
  description:
    'Parse a UUID: show its version, variant, and (for v1) the embedded timestamp.',
  defaultInput: '550e8400-e29b-41d4-a716-446655440000 ::uuidparse',
  tag: '#',
  kind: 'Analyze',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'uuidparse', 'uuidinfo')) return [];

    const uuid = trim(input).toLowerCase();

    if (!UUID_RE.test(uuid)) {
      return [
        new BoxBuilder('UUID Parse', 'A valid UUID is required.')
          .setOptions({ Error: 'A valid UUID is required.' })
          .setTemplate(KeyValueBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const isNil = uuid === '00000000-0000-0000-0000-000000000000';
    const versionDigit = uuid[14];
    const version = isNil ? '0 (nil)' : versionDigit;
    const variant = parseVariant(uuid[19]);

    const kvOptions: Record<string, string> = {
      UUID: uuid,
      Version: version,
      Variant: variant,
    };

    // include timestamp only for version 1 (time-based)
    if (!isNil && versionDigit === '1') {
      kvOptions.Timestamp = v1Timestamp(uuid);
    }

    // render k:v lines so the headless TUI shows the fields (not a blank box)
    const plaintext = Object.entries(kvOptions)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    return [
      new BoxBuilder('UUID Parse', plaintext)
        .setOptions(kvOptions)
        .setTemplate(KeyValueBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default UuidParseBoxSource;
