import { CodeBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// maps a parsed JSON value to its draft-07 schema fragment
function inferSchema(value: unknown): object {
  if (value === null) return { type: 'null' };
  if (typeof value === 'boolean') return { type: 'boolean' };
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { type: 'integer' } : { type: 'number' };
  }
  if (typeof value === 'string') return { type: 'string' };
  if (Array.isArray(value)) {
    return {
      type: 'array',
      items: value.length > 0 ? inferSchema(value[0]) : {},
    };
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>);
    const properties: Record<string, object> = {};
    for (const key of keys) {
      properties[key] = inferSchema((value as Record<string, unknown>)[key]);
    }
    return {
      type: 'object',
      properties,
      required: keys,
      additionalProperties: false,
    };
  }
  // fallback for unexpected types (e.g. undefined, functions in exotic usage)
  return {};
}

export const JsonSchemaBoxSource = {
  name: 'JSON Schema',
  description: 'Infer a JSON Schema (draft-07) from a JSON sample.',
  defaultInput: '{"id":1,"name":"Bob","tags":["a"]} ::jsonschema',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'jsonschema', 'jsonschemainfer')) return [];
    if (input.length > MAX_INPUT) return [];

    let parsed: unknown;
    try {
      parsed = JSON.parse(trim(input));
    } catch {
      return [
        new BoxBuilder('JSON Schema', 'Invalid JSON: unable to parse input')
          .setOptions({ language: 'json' })
          .setTemplate(CodeBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const schema = {
      $schema: 'http://json-schema.org/draft-07/schema#',
      ...inferSchema(parsed),
    };

    return [
      new BoxBuilder('JSON Schema', JSON.stringify(schema, null, 2))
        .setOptions({ language: 'json' })
        .setTemplate(CodeBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default JsonSchemaBoxSource;
