import { CodeBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// keys that would allow prototype pollution if set on a plain object
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

// unescape minimal backslash sequences from .properties values
function unescapeValue(raw: string): string {
  return raw
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\\\/g, '\\')
    .replace(/\\=/g, '=');
}

// parse a .properties file into a null-prototype flat object
function parseProperties(text: string): Record<string, string> {
  const result = Object.create(null) as Record<string, string>;

  for (const line of text.split('\n')) {
    const stripped = line.trimStart();

    // skip blank lines and comments
    if (!stripped || stripped[0] === '#' || stripped[0] === '!') continue;

    // split on first =, :, or whitespace acting as separator
    const eqIdx = stripped.search(/[=:\s]/);
    if (eqIdx === -1) {
      // key with no value
      const key = stripped.trim();
      if (!FORBIDDEN_KEYS.has(key)) {
        result[key] = '';
      }
      continue;
    }

    const key = stripped.slice(0, eqIdx).trim();
    if (FORBIDDEN_KEYS.has(key)) continue;

    // consume the separator character itself
    const afterSep = stripped.slice(eqIdx);
    // strip the separator and any surrounding whitespace
    const value = afterSep.replace(/^[=:\s]\s*/, '');
    result[key] = unescapeValue(value.trimEnd());
  }

  return result;
}

// serialize a flat record to .properties format
function stringifyProperties(obj: Record<string, unknown>): string {
  return Object.keys(obj)
    .filter((key) => !FORBIDDEN_KEYS.has(key) && Object.hasOwn(obj, key))
    .map((key) => {
      const raw = obj[key];
      const value = typeof raw === 'string' ? raw : JSON.stringify(raw);
      return `${key}=${value}`;
    })
    .join('\n');
}

export const PropertiesBoxSource = {
  name: 'Properties / JSON',
  description:
    'Convert a Java .properties file to JSON, or a flat JSON object to .properties.',
  defaultInput: 'server.host=localhost\nserver.port=8080 ::properties',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'properties', 'propertiesjson')) return [];
    if (input.length > MAX_INPUT) return [];

    const trimmed = trim(input);
    if (!trimmed) return [];

    const boxes: Box[] = [];

    // direction: JSON → properties when input looks like a JSON object
    if (trimmed.startsWith('{')) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        boxes.push(
          new BoxBuilder(
            'JSON → Properties',
            `Parse error: input starts with '{' but is not valid JSON`,
          )
            .setTemplate(CodeBoxTemplate)
            .setPriority(this.priority)
            .build(),
        );
        return boxes;
      }

      if (
        parsed === null ||
        typeof parsed !== 'object' ||
        Array.isArray(parsed)
      ) {
        boxes.push(
          new BoxBuilder(
            'JSON → Properties',
            'Error: expected a JSON object (not an array or primitive)',
          )
            .setTemplate(CodeBoxTemplate)
            .setPriority(this.priority)
            .build(),
        );
        return boxes;
      }

      const output = stringifyProperties(parsed as Record<string, unknown>);
      boxes.push(
        new BoxBuilder('JSON → Properties', output)
          .setTemplate(CodeBoxTemplate)
          .setPriority(this.priority)
          .build(),
      );
      return boxes;
    }

    // default direction: properties → JSON
    try {
      const obj = parseProperties(trimmed);
      const output = JSON.stringify(obj, null, 2);
      boxes.push(
        new BoxBuilder('Properties → JSON', output)
          .setOptions({ language: 'json' })
          .setTemplate(CodeBoxTemplate)
          .setPriority(this.priority)
          .build(),
      );
    } catch (e) {
      boxes.push(
        new BoxBuilder(
          'Properties → JSON',
          `Parse error: ${e instanceof Error ? e.message : String(e)}`,
        )
          .setTemplate(CodeBoxTemplate)
          .setPriority(this.priority)
          .build(),
      );
    }

    return boxes;
  },
};

export default PropertiesBoxSource;
