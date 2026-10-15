import { parseInput } from '@functions/parseOptions';
import { describe, expect, it } from 'vitest';

import { Crc32BoxSource } from '../Crc32BoxSource';
import { HaversineBoxSource } from '../HaversineBoxSource';
import { TemperatureBoxSource } from '../TemperatureBoxSource';

const keyValueSources = [
  Crc32BoxSource,
  HaversineBoxSource,
  TemperatureBoxSource,
] as const;

describe('key/value box plaintext output', () => {
  it.each(
    keyValueSources.map((source) => [source.name, source] as const),
  )('%s includes every displayed key/value entry', async (_name, source) => {
    const [input, options] = parseInput(source.defaultInput);
    const boxes = await source.generateBoxes(input, options);
    expect(boxes).toHaveLength(1);

    const box = boxes[0];
    const expectedPlaintext = Object.entries(box.props.options ?? {})
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');

    expect(box.props.plaintextOutput).toBe(expectedPlaintext);
  });
});
