import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';
import { ByteLengthBoxSource } from '../ByteLengthBoxSource';

describe('ByteLengthBoxSource', () => {
  it('returns [] when no option is provided', async () => {
    const boxes = await ByteLengthBoxSource.generateBoxes('hello', null);
    expect(boxes).toHaveLength(0);
  });

  it('returns [] when an unrelated option is provided', async () => {
    const boxes = await ByteLengthBoxSource.generateBoxes('hello', {
      qrcode: true,
    });
    expect(boxes).toHaveLength(0);
  });

  it('returns [] for empty input', async () => {
    const boxes = await ByteLengthBoxSource.generateBoxes('', {
      bytelen: true,
    });
    expect(boxes).toHaveLength(0);
  });

  it('handles ascii string with ::bytelen', async () => {
    const boxes = await ByteLengthBoxSource.generateBoxes('abc', {
      bytelen: true,
    });
    expect(boxes).toHaveLength(1);
    expect(boxes[0].props.options).toMatchObject({
      'UTF-16 Units': '3',
      'Code Points': '3',
      'UTF-8 Bytes': '3',
    });
    expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
  });

  it('handles ascii string with ::bytelength alias', async () => {
    const boxes = await ByteLengthBoxSource.generateBoxes('abc', {
      bytelength: true,
    });
    expect(boxes).toHaveLength(1);
  });

  it('handles ascii string with ::len alias', async () => {
    const boxes = await ByteLengthBoxSource.generateBoxes('abc', { len: true });
    expect(boxes).toHaveLength(1);
  });

  it('correctly counts héllo (é is 1 code point, 2 UTF-8 bytes)', async () => {
    const boxes = await ByteLengthBoxSource.generateBoxes('héllo', {
      bytelen: true,
    });
    expect(boxes).toHaveLength(1);
    expect(boxes[0].props.options).toMatchObject({
      'Code Points': '5',
      'UTF-8 Bytes': '6',
    });
  });

  it('correctly counts astral 😀 (surrogate pair in UTF-16)', async () => {
    const boxes = await ByteLengthBoxSource.generateBoxes('😀', {
      bytelen: true,
    });
    expect(boxes).toHaveLength(1);
    expect(boxes[0].props.options).toMatchObject({
      'UTF-16 Units': '2',
      'Code Points': '1',
      'UTF-8 Bytes': '4',
    });
  });

  it('correctly counts € (3 UTF-8 bytes)', async () => {
    const boxes = await ByteLengthBoxSource.generateBoxes('€', {
      bytelen: true,
    });
    expect(boxes).toHaveLength(1);
    expect(boxes[0].props.options).toMatchObject({
      'UTF-8 Bytes': '3',
    });
  });

  it('sets priority from source constant', async () => {
    const boxes = await ByteLengthBoxSource.generateBoxes('abc', {
      bytelen: true,
    });
    expect(boxes[0].props.priority).toBe(ByteLengthBoxSource.priority);
  });

  it('sets box name to Byte Length', async () => {
    const boxes = await ByteLengthBoxSource.generateBoxes('abc', {
      bytelen: true,
    });
    expect(boxes[0].props.name).toBe('Byte Length');
  });
});
