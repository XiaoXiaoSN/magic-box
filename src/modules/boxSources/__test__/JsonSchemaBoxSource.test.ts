import type { BoxOptions } from '@modules/Box';
import { describe, expect, it } from 'vitest';
import { JsonSchemaBoxSource } from '../JsonSchemaBoxSource';

const generate = (input: string, options: BoxOptions = null) =>
  JsonSchemaBoxSource.generateBoxes(input, options);

const parseOutput = async (input: string, options = {}) => {
  const boxes = await generate(input, options);
  return JSON.parse(boxes[0].props.plaintextOutput);
};

describe('JsonSchemaBoxSource', () => {
  it('returns [] when no trigger option is present', async () => {
    const boxes = await generate('{"id":1}', {});
    expect(boxes).toEqual([]);
  });

  it('infers a full object schema for a typical sample', async () => {
    const schema = await parseOutput('{"id":1,"name":"Bob","tags":["a"]}', {
      jsonschema: true,
    });
    expect(schema.$schema).toBe('http://json-schema.org/draft-07/schema#');
    expect(schema.type).toBe('object');
    expect(schema.properties.id.type).toBe('integer');
    expect(schema.properties.name.type).toBe('string');
    expect(schema.properties.tags.type).toBe('array');
    expect(schema.properties.tags.items.type).toBe('string');
    expect(schema.required).toContain('id');
    expect(schema.required).toContain('name');
    expect(schema.required).toContain('tags');
    expect(schema.additionalProperties).toBe(false);
  });

  it('uses type number for floats', async () => {
    const schema = await parseOutput('{"x":1.5}', { jsonschema: true });
    expect(schema.properties.x.type).toBe('number');
  });

  it('uses type boolean and null correctly', async () => {
    const schema = await parseOutput('{"a":true,"b":null}', {
      jsonschemainfer: true,
    });
    expect(schema.properties.a.type).toBe('boolean');
    expect(schema.properties.b.type).toBe('null');
  });

  it('uses empty object for items when array is empty', async () => {
    const schema = await parseOutput('{"xs":[]}', { jsonschema: true });
    expect(schema.properties.xs.type).toBe('array');
    expect(schema.properties.xs.items).toEqual({});
  });

  it('handles nested objects recursively', async () => {
    const schema = await parseOutput('{"o":{"k":1}}', { jsonschema: true });
    expect(schema.properties.o.type).toBe('object');
    expect(schema.properties.o.properties.k.type).toBe('integer');
  });

  it('returns an error box for invalid JSON', async () => {
    const boxes = await generate('{bad', { jsonschema: true });
    expect(boxes).toHaveLength(1);
    expect(boxes[0].props.plaintextOutput).toMatch(/invalid json/i);
  });
});
