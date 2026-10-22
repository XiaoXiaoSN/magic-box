import { describe, expect, it } from 'vitest';

import { KsuidBoxSource } from '../KsuidBoxSource';

describe('KsuidBoxSource', () => {
  const canonical = '0ujtsYcgvSTl8PAuAdqWYSMnLOv';

  it('requires an explicit directive', async () => {
    expect(await KsuidBoxSource.generateBoxes(canonical, null)).toHaveLength(0);
    expect(
      await KsuidBoxSource.generateBoxes(canonical, { ksuid: true }),
    ).toHaveLength(1);
  });

  it('decodes the KSUID epoch timestamp and full payload', async () => {
    const boxes = await KsuidBoxSource.generateBoxes(canonical, {
      ksuid: true,
    });
    const options = boxes[0].props.options as Record<string, string>;

    expect(options.KSUID).toBe(canonical);
    expect(options['Unix (s)']).toBe('1507608047');
    expect(options.Timestamp).toBe('2017-10-10T04:00:47.000Z');
    expect(options.Payload).toBe('b5a1cd34b5f99d1154fb6853345c9735');
  });

  it('rejects invalid alphabet, length, and 160-bit overflow', async () => {
    for (const candidate of [
      '0ujtsYcgvSTl8PAuAdqWYSMnLO',
      '0ujtsYcgvSTl8PAuAdqWYSMnLO!',
      'zzzzzzzzzzzzzzzzzzzzzzzzzzz',
    ]) {
      const boxes = await KsuidBoxSource.generateBoxes(candidate, {
        ksuid: true,
      });
      expect(boxes[0].props.plaintextOutput).toMatch(/invalid ksuid/i);
    }
  });

  it('accepts a value supplied to ::ksuid', async () => {
    const boxes = await KsuidBoxSource.generateBoxes('', { ksuid: canonical });
    expect(boxes[0].props.options?.Payload).toBe(
      'b5a1cd34b5f99d1154fb6853345c9735',
    );
  });
});
