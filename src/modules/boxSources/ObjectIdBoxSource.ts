import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// regex to strip an optional ObjectId("...") or ObjectId('...') wrapper
const WRAPPER_RE = /^ObjectId\(["']([0-9a-f]{24})["']\)$/i;
const HEX24_RE = /^[0-9a-f]{24}$/i;

/** strips an ObjectId("...") wrapper and returns the bare hex string, or null if invalid */
function parseObjectId(raw: string): string | null {
  const trimmed = trim(raw);

  const wrapperMatch = WRAPPER_RE.exec(trimmed);
  if (wrapperMatch) {
    return wrapperMatch[1].toLowerCase();
  }

  if (HEX24_RE.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  return null;
}

export const ObjectIdBoxSource = {
  name: 'MongoDB ObjectId',
  description:
    'Parse a MongoDB ObjectId (24 hex chars) into its embedded timestamp, machine, and counter.',
  defaultInput: '507f1f77bcf86cd799439011 ::objectid',
  tag: '#',
  kind: 'Decode',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'objectid', 'oid')) return [];

    const id = parseObjectId(input);

    if (id === null) {
      // return an explanatory box for invalid input
      const plaintext =
        'ObjectId: (invalid)\nReason: a 24-character hex ObjectId is required';
      return [
        new BoxBuilder('MongoDB ObjectId', plaintext)
          .setOptions({
            ObjectId: '(invalid)',
            Reason: 'a 24-character hex ObjectId is required',
          })
          .setTemplate(KeyValueBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const timestampHex = id.slice(0, 8);
    const randomMachine = id.slice(8, 18);
    const counterHex = id.slice(18, 24);

    const timestampUnix = Number.parseInt(timestampHex, 16);
    const counter = Number.parseInt(counterHex, 16);
    const timestampUTC = new Date(timestampUnix * 1000).toISOString();

    // build k:v plaintext for copy-to-clipboard
    const kvData: Record<string, string> = {
      'Timestamp (hex)': timestampHex,
      'Timestamp (unix)': String(timestampUnix),
      'Timestamp (UTC)': timestampUTC,
      'Random / Machine': randomMachine,
      Counter: String(counter),
      ObjectId: id,
    };

    const plaintext = Object.entries(kvData)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    return [
      new BoxBuilder('MongoDB ObjectId', plaintext)
        .setOptions(kvData)
        .setTemplate(KeyValueBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default ObjectIdBoxSource;
