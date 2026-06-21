import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// uuid regex for validating a custom namespace argument
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// predefined namespaces per RFC 4122 appendix C
const NAMESPACES: Record<string, string> = {
  dns: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
  url: '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
  oid: '6ba7b812-9dad-11d1-80b4-00c04fd430c8',
  x500: '6ba7b814-9dad-11d1-80b4-00c04fd430c8',
};

// parse a UUID string (with hyphens) into a 16-byte Uint8Array
function uuidToBytes(uuid: string): Uint8Array {
  const hex = uuid.replace(/-/g, '');
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

// format a 16-byte array as a lowercase 8-4-4-4-12 UUID string
function bytesToUuid(bytes: Uint8Array): string {
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

// compute a UUID v5 from a namespace UUID string and a name string
async function computeUuidV5(
  namespaceUuid: string,
  name: string,
): Promise<string> {
  const namespaceBytes = uuidToBytes(namespaceUuid);
  const nameBytes = new TextEncoder().encode(name);

  // concatenate namespace bytes and name bytes as the SHA-1 input
  const input = new Uint8Array(namespaceBytes.length + nameBytes.length);
  input.set(namespaceBytes, 0);
  input.set(nameBytes, namespaceBytes.length);

  const hashBuffer = await crypto.subtle.digest('SHA-1', input);
  const hash = new Uint8Array(hashBuffer);

  // take the first 16 bytes and apply version/variant bits per RFC 4122 §4.3
  const result = hash.slice(0, 16);
  result[6] = (result[6] & 0x0f) | 0x50; // version 5
  result[8] = (result[8] & 0x3f) | 0x80; // RFC 4122 variant

  return bytesToUuid(result);
}

export const UuidV5BoxSource = {
  name: 'UUID v5',
  description:
    'Generate a deterministic name-based UUID v5 (SHA-1). ::uuidv5=<namespace> where namespace is dns/url/oid/x500 or a UUID; the input is the name.',
  defaultInput: 'example.com ::uuidv5=dns',
  tag: '#',
  kind: 'Generate',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'uuidv5')) return [];
    if (input.length > MAX_INPUT) return [];

    // guard for non-secure contexts where crypto.subtle is unavailable
    if (typeof crypto === 'undefined' || !crypto.subtle) {
      return [
        new BoxBuilder(
          'UUID v5',
          'UUID v5 requires a secure context (HTTPS). crypto.subtle is not available.',
        )
          .setTemplate(KeyValueBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const nsArg = extractOptionKeys(options, 'uuidv5');

    // bare ::uuidv5 (value is true boolean) or unknown/invalid string → explain required namespace
    if (
      nsArg === true ||
      nsArg === null ||
      (typeof nsArg === 'string' &&
        !NAMESPACES[nsArg.toLowerCase()] &&
        !UUID_REGEX.test(nsArg))
    ) {
      return [
        new BoxBuilder(
          'UUID v5',
          'A namespace is required. Use ::uuidv5=dns, ::uuidv5=url, ::uuidv5=oid, ::uuidv5=x500, or ::uuidv5=<uuid>.',
        )
          .setTemplate(KeyValueBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      ];
    }

    // resolve the namespace uuid from the named alias or use the provided uuid directly
    const nsKey = (nsArg as string).toLowerCase();
    const namespaceUuid = NAMESPACES[nsKey] ?? (nsArg as string).toLowerCase();
    const name = trim(input);

    const uuid = await computeUuidV5(namespaceUuid, name);

    const kvOptions: Record<string, string> = {
      UUID: uuid,
      Namespace: namespaceUuid,
      Name: name,
    };

    const plaintextOutput = `UUID: ${uuid}\nNamespace: ${namespaceUuid}\nName: ${name}`;

    return [
      new BoxBuilder('UUID v5', plaintextOutput)
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(kvOptions)
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default UuidV5BoxSource;
