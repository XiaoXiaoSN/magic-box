import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 20;

// canonical UUID regex per RFC 4122
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const VERSION_LABELS: Record<number, string> = {
  1: 'time-based',
  2: 'DCE security',
  3: 'name-based MD5',
  4: 'random',
  5: 'name-based SHA-1',
  6: 'reordered time (RFC 9562)',
  7: 'Unix epoch ms (RFC 9562)',
  8: 'custom (RFC 9562)',
};

// determine RFC 4122 variant from the high bits of the variant octet
function getVariant(variantHex: string): string {
  const nibble = Number.parseInt(variantHex, 16);
  if (nibble >= 0xe) return 'Reserved';
  if (nibble >= 0xc) return 'Microsoft (reserved)';
  if (nibble >= 0x8) return 'RFC 4122';
  return 'NCS (reserved)';
}

export const UuidInspectBoxSource = {
  name: 'UUID Inspect',
  description: 'Parse a UUID and report its version and variant.',
  defaultInput: '550e8400-e29b-41d4-a716-446655440000 ::uuidinfo',
  tag: '#',
  kind: 'Analyze',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'uuidinfo', 'uuidinspect')) return [];

    const uuid = trim(input).toLowerCase();
    if (!UUID_REGEX.test(uuid)) return [];

    // nil UUID special case
    if (uuid === '00000000-0000-0000-0000-000000000000') {
      const kvOptions = {
        UUID: uuid,
        Version: 'nil',
        Variant: 'nil',
      };
      const plaintextOutput = `UUID: ${uuid}\nVersion: nil\nVariant: nil`;

      return [
        new BoxBuilder('UUID Inspect', plaintextOutput)
          .setTemplate(KeyValueBoxTemplate)
          .setOptions(kvOptions)
          .setPriority(this.priority)
          .build(),
      ];
    }

    // groups: [full, g1, g2, g3, g4, g5]
    const groups = uuid.split('-');
    // version is the first hex digit of the 3rd group (index 2), i.e. the 13th hex char
    const versionDigit = Number.parseInt(groups[2][0], 16);
    const label = VERSION_LABELS[versionDigit];
    const versionStr = label
      ? `${versionDigit} (${label})`
      : `${versionDigit} (unknown)`;

    // variant is determined by the high bits of the first hex digit of the 4th group (index 3)
    const variantStr = getVariant(groups[3][0]);

    const kvOptions = {
      UUID: uuid,
      Version: versionStr,
      Variant: variantStr,
    };
    const plaintextOutput = `UUID: ${uuid}\nVersion: ${versionStr}\nVariant: ${variantStr}`;

    return [
      new BoxBuilder('UUID Inspect', plaintextOutput)
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(kvOptions)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default UuidInspectBoxSource;
