import { describe, expect, it } from 'vitest';

import YamlJsonBoxSource from '../YamlJsonBoxSource';

describe('YamlJsonBoxSource', () => {
  it('should convert JSON to YAML when requested', async () => {
    const input = '{"ab": [1, 2, 3]}';
    const options = { yaml: true };
    const boxes = await YamlJsonBoxSource.generateBoxes(input, options);

    expect(boxes).toHaveLength(1);
    expect(boxes[0].props.name).toBe('JSON to YAML');
    expect(boxes[0].props.plaintextOutput).toContain('ab:');
    expect(boxes[0].props.plaintextOutput).toContain('- 1');
  });

  it('should convert JSON to YAML with ::toYAML', async () => {
    const input = '{"ab": [1, 2, 3]}';
    const options = { toyaml: true };
    const boxes = await YamlJsonBoxSource.generateBoxes(input, options);

    expect(boxes).toHaveLength(1);
    expect(boxes[0].props.name).toBe('JSON to YAML');
  });

  it('should convert YAML to JSON when requested', async () => {
    const input = 'ab:\n  - 1\n  - 2\n  - 3';
    const options = { json: true };
    const boxes = await YamlJsonBoxSource.generateBoxes(input, options);

    expect(boxes).toHaveLength(1);
    expect(boxes[0].props.name).toBe('YAML to JSON');
    const output = JSON.parse(boxes[0].props.plaintextOutput);
    expect(output.ab).toEqual([1, 2, 3]);
  });

  it('should convert YAML to JSON with ::toJSON', async () => {
    const input = 'ab:\n  - 1\n  - 2\n  - 3';
    const options = { tojson: true };
    const boxes = await YamlJsonBoxSource.generateBoxes(input, options);

    expect(boxes).toHaveLength(1);
    expect(boxes[0].props.name).toBe('YAML to JSON');
  });

  it('should not show boxes if no command is given', async () => {
    const input = '{"ab": [1, 2, 3]}';
    const options = {};
    const boxes = await YamlJsonBoxSource.generateBoxes(input, options);

    expect(boxes).toHaveLength(0);
  });

  it('should handle invalid input gracefully', async () => {
    const input = 'invalid json';
    const options = { yaml: true };
    const boxes = await YamlJsonBoxSource.generateBoxes(input, options);

    expect(boxes).toHaveLength(0);
  });
});
