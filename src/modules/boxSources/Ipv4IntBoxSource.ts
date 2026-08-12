import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// max valid IPv4 integer: 2^32 - 1
const MAX_IPV4_INT = 4294967295;

const IPV4_REGEX = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

// build a zero-padded 8-digit lowercase hex string prefixed with 0x
function toHex(n: number): string {
  return `0x${n.toString(16).padStart(8, '0')}`;
}

// convert an IPv4 string to its 32-bit unsigned integer representation
function ipToInt(ip: string): number | null {
  const m = IPV4_REGEX.exec(ip);
  if (!m) return null;

  const octets = [m[1], m[2], m[3], m[4]].map((s) => Number.parseInt(s, 10));
  if (octets.some((o) => o < 0 || o > 255)) return null;

  // use multiplication to stay unsigned (avoids signed-32-bit overflow of <<)
  return octets[0] * 16777216 + octets[1] * 65536 + octets[2] * 256 + octets[3];
}

// convert a 32-bit unsigned integer to dotted-decimal IPv4
function intToIp(n: number): string {
  const a = Math.floor(n / 16777216) % 256;
  const b = Math.floor(n / 65536) % 256;
  const c = Math.floor(n / 256) % 256;
  const d = n % 256;
  return `${a}.${b}.${c}.${d}`;
}

// build a plaintext string consumed by KeyValueBoxTemplate
function kvToPlaintext(pairs: Record<string, string>): string {
  return Object.entries(pairs)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

export const Ipv4IntBoxSource = {
  defaultDisabled: true,
  name: 'IPv4 ↔ Integer',
  description:
    'Convert an IPv4 address to its 32-bit integer and hex, or an integer back to an IPv4 address.',
  defaultInput: '192.168.1.1 ::iptoint',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'iptoint', 'ipint')) return [];

    const raw = trim(input);

    // guard against absurdly long inputs
    if (raw.length > 40) return [];

    if (IPV4_REGEX.test(raw)) {
      // ip → integer direction
      const n = ipToInt(raw);
      if (n === null) {
        // invalid octet value — fall through to help box
      } else {
        const kv: Record<string, string> = {
          IPv4: raw,
          Integer: n.toString(),
          Hex: toHex(n),
        };
        return [
          new BoxBuilder('IPv4 ↔ Integer', kvToPlaintext(kv))
            .setTemplate(KeyValueBoxTemplate)
            .setOptions(kv)
            .setPriority(this.priority)
            .build(),
        ];
      }
    } else if (/^\d+$/.test(raw)) {
      // integer → ip direction
      const n = Number.parseInt(raw, 10);
      if (n >= 0 && n <= MAX_IPV4_INT) {
        const ip = intToIp(n);
        const kv: Record<string, string> = {
          Integer: raw,
          IPv4: ip,
          Hex: toHex(n),
        };
        return [
          new BoxBuilder('IPv4 ↔ Integer', kvToPlaintext(kv))
            .setTemplate(KeyValueBoxTemplate)
            .setOptions(kv)
            .setPriority(this.priority)
            .build(),
        ];
      }
    }

    // unrecognised input — explain accepted formats
    const helpText =
      'Enter an IPv4 address (e.g. 192.168.1.1) or an integer 0..4294967295';
    const kv: Record<string, string> = { Format: helpText };
    return [
      new BoxBuilder('IPv4 ↔ Integer', kvToPlaintext(kv))
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(kv)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default Ipv4IntBoxSource;
