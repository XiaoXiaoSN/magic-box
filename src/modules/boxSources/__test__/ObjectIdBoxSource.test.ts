import { describe, expect, it } from 'vitest';

import { ObjectIdBoxSource } from '../ObjectIdBoxSource';

describe('ObjectIdBoxSource', () => {
  it('requires an explicit directive and does not auto-match a 24-char id', async () => {
    expect(
      await ObjectIdBoxSource.generateBoxes('507f1f77bcf86cd799439011', null),
    ).toHaveLength(0);
    expect(
      await ObjectIdBoxSource.generateBoxes('507f1f77bcf86cd799439011', {
        objectid: true,
      }),
    ).toHaveLength(1);
  });

  it('decodes the timestamp, random bytes, and counter', async () => {
    const boxes = await ObjectIdBoxSource.generateBoxes(
      '507f1f77bcf86cd799439011',
      { objectid: true },
    );
    const options = boxes[0].props.options as Record<string, string>;

    expect(options.ObjectId).toBe('507f1f77bcf86cd799439011');
    expect(options['Unix (s)']).toBe(String(0x507f1f77));
    expect(options.Random).toBe('bcf86cd799');
    expect(options.Counter).toBe(String(0x439011));
    expect(options.Timestamp).toMatch(/T\d{2}:\d{2}:\d{2}\.000Z$/);
  });

  it('accepts the id as the directive value', async () => {
    const boxes = await ObjectIdBoxSource.generateBoxes('', {
      objectid: '000000000000000000000001',
    });
    expect(boxes[0].props.options?.Counter).toBe('1');
  });

  it('returns a bounded error for malformed ids', async () => {
    const boxes = await ObjectIdBoxSource.generateBoxes('not-an-object-id', {
      objectid: true,
    });
    expect(boxes).toHaveLength(1);
    expect(boxes[0].props.plaintextOutput).toMatch(/invalid objectid/i);
  });
});
