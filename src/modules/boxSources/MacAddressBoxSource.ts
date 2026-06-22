import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// max input length to guard against pathological inputs
const MAX_INPUT_LENGTH = 40;

// renders a key-value record as "key: value" lines for the plaintext output
function kvToPlaintext(kv: Record<string, string>): string {
  return Object.entries(kv)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

interface MacResult {
  colon: string;
  hyphen: string;
  dot: string;
  bare: string;
  oui: string;
  nic: string;
  type: string;
  eui64: string;
}

// extract exactly 12 hex digits from common MAC formats:
//   colon:  01:23:45:67:89:ab
//   hyphen: 01-23-45-67-89-ab
//   dot:    0123.4567.89ab (Cisco)
//   bare:   0123456789ab
function extractHexDigits(raw: string): string | null {
  const s = raw.toLowerCase();

  // colon or hyphen separated: 6 groups of 2 hex digits
  if (/^[0-9a-f]{2}([:][0-9a-f]{2}){5}$/.test(s)) {
    return s.replace(/:/g, '');
  }
  if (/^[0-9a-f]{2}([-][0-9a-f]{2}){5}$/.test(s)) {
    return s.replace(/-/g, '');
  }

  // Cisco dot notation: 3 groups of 4 hex digits
  if (/^[0-9a-f]{4}(\.[0-9a-f]{4}){2}$/.test(s)) {
    return s.replace(/\./g, '');
  }

  // bare: exactly 12 hex digits
  if (/^[0-9a-f]{12}$/.test(s)) {
    return s;
  }

  return null;
}

// split 12-char hex string into an array of 6 byte strings (lowercase)
function toBytes(hex: string): string[] {
  const bytes: string[] = [];
  for (let i = 0; i < 12; i += 2) {
    bytes.push(hex.slice(i, i + 2));
  }
  return bytes;
}

// compute EUI-64 by inserting ff:fe after the OUI and flipping the U/L bit
function computeEUI64(bytes: string[]): string {
  const firstByte = Number.parseInt(bytes[0], 16);
  // flip bit 6 (the U/L bit, 0x02) to indicate universal scope
  const flipped = (firstByte ^ 0x02).toString(16).padStart(2, '0');
  const eui64Bytes = [
    flipped,
    ...bytes.slice(1, 3),
    'ff',
    'fe',
    ...bytes.slice(3),
  ];
  return eui64Bytes.join(':');
}

function analyzeMac(hex: string): MacResult {
  const bytes = toBytes(hex);

  const colon = bytes.join(':');
  const hyphen = bytes.join('-');
  const dot = `${hex.slice(0, 4)}.${hex.slice(4, 8)}.${hex.slice(8, 12)}`;
  const bare = hex;

  const oui = bytes.slice(0, 3).join(':');
  const nic = bytes.slice(3).join(':');

  // read the first byte to determine address type flags
  const firstByteVal = Number.parseInt(bytes[0], 16);
  const isMulticast = (firstByteVal & 0x01) !== 0;
  const isLocallyAdministered = (firstByteVal & 0x02) !== 0;

  const castType = isMulticast ? 'multicast' : 'unicast';
  const adminType = isLocallyAdministered
    ? 'locally administered'
    : 'globally unique';
  const type = `${castType}, ${adminType}`;

  const eui64 = computeEUI64(bytes);

  return { colon, hyphen, dot, bare, oui, nic, type, eui64 };
}

export const MacAddressBoxSource = {
  name: 'MAC Address',
  description:
    'Normalize a MAC address and show its formats, OUI prefix, and flags.',
  defaultInput: '01:23:45:67:89:ab ::mac',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'mac', 'macaddress')) return [];

    const raw = trim(input).slice(0, MAX_INPUT_LENGTH);

    const hex = extractHexDigits(raw);

    if (hex === null) {
      const kv: Record<string, string> = {
        Error:
          'A valid MAC address is required (e.g. 01:23:45:67:89:ab, 01-23-45-67-89-ab, 0123.4567.89ab, or 0123456789ab).',
      };
      return [
        new BoxBuilder('MAC Address', kvToPlaintext(kv))
          .setTemplate(KeyValueBoxTemplate)
          .setOptions(kv)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const result = analyzeMac(hex);

    const kv: Record<string, string> = {
      Colon: result.colon,
      Hyphen: result.hyphen,
      Dot: result.dot,
      Bare: result.bare,
      OUI: result.oui,
      NIC: result.nic,
      Type: result.type,
      'EUI-64': result.eui64,
    };

    return [
      new BoxBuilder('MAC Address', kvToPlaintext(kv))
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(kv)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default MacAddressBoxSource;
