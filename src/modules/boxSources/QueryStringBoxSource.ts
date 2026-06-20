import { CodeBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// serialize a plain object to a URL query string, encoding keys and values
function serializeToQueryString(obj: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const encodedKey = encodeURIComponent(key);
    if (Array.isArray(value)) {
      for (const item of value) {
        parts.push(`${encodedKey}=${encodeURIComponent(String(item))}`);
      }
    } else {
      parts.push(`${encodedKey}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts.join('&');
}

// parse a query string into an object; repeated keys become arrays
function parseQueryString(raw: string): Record<string, string | string[]> {
  const stripped = raw.startsWith('?') ? raw.slice(1) : raw;
  const params = new URLSearchParams(stripped);
  const result: Record<string, string | string[]> = {};

  for (const key of params.keys()) {
    const values = params.getAll(key);
    result[key] = values.length === 1 ? values[0] : values;
  }
  return result;
}

export const QueryStringBoxSource = {
  name: 'Query String',
  description:
    'Parse a URL query string into JSON, or serialize a JSON object into a query string.',
  defaultInput: 'a=1&b=2&b=3 ::qs',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'qs', 'querystring')) return [];
    if (input.length > MAX_INPUT) return [];

    const s = trim(input);

    // JSON → Query String
    if (s.startsWith('{')) {
      try {
        const obj = JSON.parse(s) as Record<string, unknown>;
        const output = serializeToQueryString(obj);
        return [
          new BoxBuilder('JSON → Query String', output)
            .setTemplate(CodeBoxTemplate)
            .setPriority(this.priority)
            .build(),
        ];
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        return [
          new BoxBuilder(
            'Query String Error',
            `Failed to parse JSON: ${message}`,
          )
            .setTemplate(CodeBoxTemplate)
            .setPriority(this.priority)
            .build(),
        ];
      }
    }

    // Query String → JSON
    try {
      const obj = parseQueryString(s);
      const output = JSON.stringify(obj, null, 2);
      return [
        new BoxBuilder('Query String → JSON', output)
          .setTemplate(CodeBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return [
        new BoxBuilder(
          'Query String Error',
          `Failed to parse query string: ${message}`,
        )
          .setTemplate(CodeBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }
  },
};

export default QueryStringBoxSource;
