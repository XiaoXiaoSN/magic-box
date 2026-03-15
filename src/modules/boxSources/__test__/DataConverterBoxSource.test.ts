import { describe, expect, it } from 'vitest';

import { DataConverterBoxSource } from '../DataConverterBoxSource';

describe('DataConverterBoxSource', () => {
  const jsonInput = '{"name":"John","age":30}';

  describe('generateBoxes', () => {
    it('should convert JSON to YAML, TOML, and XML when requested', async () => {
      const boxes = await DataConverterBoxSource.generateBoxes(jsonInput, {
        yaml: true,
        toml: true,
        xml: true,
        json: true,
      });

      expect(boxes.length).toBeGreaterThanOrEqual(4);

      const names = boxes.map((b) => b.props.name);
      expect(names).toContain('YAML Output');
      expect(names).toContain('TOML Output');
      expect(names).toContain('XML Output');
      expect(names).toContain('JSON Output'); // because input was not pretty

      const yamlBox = boxes.find((b) => b.props.name === 'YAML Output');
      expect(yamlBox?.props.options?.language).toBe('yaml');
      expect(yamlBox?.props.plaintextOutput).toContain('name: John');
      expect(yamlBox?.props.plaintextOutput).toContain('age: 30');

      const xmlBox = boxes.find((b) => b.props.name === 'XML Output');
      expect(xmlBox?.props.options?.language).toBe('xml');
      // fast-xml-parser might wrap in <root> or similar depending on implementation
      expect(xmlBox?.props.plaintextOutput).toContain('<name>John</name>');
    });

    it('should automatically provide pretty-print for source format without options', async () => {
      const boxes = await DataConverterBoxSource.generateBoxes(jsonInput, {});
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('JSON Output');
    });

    it('should convert YAML to JSON, TOML, and XML when requested', async () => {
      const yamlInput = `name: John
age: 30`;
      const boxes = await DataConverterBoxSource.generateBoxes(yamlInput, {
        json: true,
        toml: true,
        xml: true,
      });

      const names = boxes.map((b) => b.props.name);
      expect(names).toContain('JSON Output');
      expect(names).toContain('TOML Output');
      expect(names).toContain('XML Output');

      const jsonBox = boxes.find((b) => b.props.name === 'JSON Output');
      expect(jsonBox?.props.options?.language).toBe('json');
      const parsed = JSON.parse(jsonBox?.props.plaintextOutput ?? '{}');
      expect(parsed.name).toBe('John');
    });

    it('should convert TOML to JSON, YAML, and XML when requested', async () => {
      const tomlInput = `name = "John"
age = 30`;
      const boxes = await DataConverterBoxSource.generateBoxes(tomlInput, {
        json: true,
        yaml: true,
        xml: true,
      });

      const names = boxes.map((b) => b.props.name);
      expect(names).toContain('JSON Output');
      expect(names).toContain('YAML Output');
      expect(names).toContain('XML Output');

      const yamlBox = boxes.find((b) => b.props.name === 'YAML Output');
      expect(yamlBox?.props.plaintextOutput).toContain('name: John');
    });

    it('should convert XML to JSON, YAML, and TOML when requested', async () => {
      const xmlInput = '<person><name>John</name><age>30</age></person>';
      const boxes = await DataConverterBoxSource.generateBoxes(xmlInput, {
        json: true,
        yaml: true,
        toml: true,
      });

      const names = boxes.map((b) => b.props.name);
      expect(names).toContain('JSON Output');
      expect(names).toContain('YAML Output');
      expect(names).toContain('TOML Output');

      const jsonBox = boxes.find((b) => b.props.name === 'JSON Output');
      // Depending on fast-xml-parser settings, it might have a root element
      expect(jsonBox?.props.plaintextOutput).toContain('"name": "John"');
    });

    it('should only show requested format when options are provided', async () => {
      const boxes = await DataConverterBoxSource.generateBoxes(jsonInput, {
        yaml: true,
      });
      const names = boxes.map((b) => b.props.name);
      expect(names).toContain('YAML Output');
      expect(names).not.toContain('TOML Output');
      expect(names).not.toContain('XML Output');
    });

    it('should not show output if input is already pretty and no options provided', async () => {
      const prettyJson = `{
    "name": "John",
    "age": 30
}`;
      const boxes = await DataConverterBoxSource.generateBoxes(prettyJson, {});
      expect(boxes).toHaveLength(0);
    });

    it('should return empty array for invalid input', async () => {
      const boxes = await DataConverterBoxSource.generateBoxes(
        'just a random string',
        {},
      );
      expect(boxes).toHaveLength(0);
    });
  });
});
