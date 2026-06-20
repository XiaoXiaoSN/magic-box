import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { isString } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 50_000;

export const HttpHeadersBoxSource = {
  name: 'HTTP Headers',
  description: 'Parse a raw HTTP header block into key/value pairs.',
  defaultInput:
    'Content-Type: application/json\nCache-Control: no-cache ::headers',
  tag: '#',
  kind: 'Analyze',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'headers', 'httpheaders')) return [];
    if (!isString(input) || input.length === 0 || input.length > MAX_INPUT)
      return [];

    // accumulate header values, merging repeated names with ', '. HTTP field
    // names are case-insensitive (RFC 9110), so dedupe by lowercased name while
    // preserving the first-seen display casing
    const headers = new Map<string, { name: string; value: string }>();

    for (const rawLine of input.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (line.length === 0) continue;

      const colonIdx = line.indexOf(':');
      // skip lines without a colon (e.g. request/status lines like 'GET /path HTTP/1.1')
      if (colonIdx === -1) continue;

      const name = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim();

      if (name.length === 0) continue;

      const key = name.toLowerCase();
      const existing = headers.get(key);
      if (existing) {
        existing.value = `${existing.value}, ${value}`;
      } else {
        headers.set(key, { name, value });
      }
    }

    if (headers.size === 0) return [];

    const output: Record<string, string> = {};
    for (const { name, value } of headers.values()) {
      output[name] = value;
    }

    return [
      new BoxBuilder('HTTP Headers', '')
        .setOptions(output)
        .setTemplate(KeyValueBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default HttpHeadersBoxSource;
