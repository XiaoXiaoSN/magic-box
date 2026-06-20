import { NumberBaseBoxSource } from '@modules/boxSources/NumberBaseBoxSource';
import { describe, expect, it } from 'vitest';

describe('NumberBaseBoxSource', () => {
  it('returns [] when ::base option is absent', async () => {
    const boxes = await NumberBaseBoxSource.generateBoxes('255', null);
    expect(boxes).toHaveLength(0);
  });

  it('converts decimal 255 to all bases', async () => {
    const boxes = await NumberBaseBoxSource.generateBoxes('255', {
      base: true,
    });
    expect(boxes).toHaveLength(1);
    const { options } = boxes[0].props;
    expect(options).toEqual({
      Decimal: '255',
      Hexadecimal: '0xff',
      Octal: '0o377',
      Binary: '0b11111111',
    });
  });

  it('converts hex literal 0xff (same result as decimal 255)', async () => {
    const boxes = await NumberBaseBoxSource.generateBoxes('0xff', {
      base: true,
    });
    expect(boxes).toHaveLength(1);
    expect(boxes[0].props.options).toEqual({
      Decimal: '255',
      Hexadecimal: '0xff',
      Octal: '0o377',
      Binary: '0b11111111',
    });
  });

  it('converts binary literal 0b1010', async () => {
    const boxes = await NumberBaseBoxSource.generateBoxes('0b1010', {
      base: true,
    });
    expect(boxes).toHaveLength(1);
    expect((boxes[0].props.options as Record<string, string>).Decimal).toBe(
      '10',
    );
  });

  it('returns [] for non-integer input', async () => {
    const boxes = await NumberBaseBoxSource.generateBoxes('hello', {
      base: true,
    });
    expect(boxes).toHaveLength(0);
  });

  it('handles large values beyond Number.MAX_SAFE_INTEGER exactly', async () => {
    const boxes = await NumberBaseBoxSource.generateBoxes(
      '0xffffffffffffffff',
      { base: true },
    );
    expect(boxes).toHaveLength(1);
    expect((boxes[0].props.options as Record<string, string>).Decimal).toBe(
      '18446744073709551615',
    );
  });

  it('converts negative decimal', async () => {
    const boxes = await NumberBaseBoxSource.generateBoxes('-255', {
      base: true,
    });
    expect(boxes).toHaveLength(1);
    const opts = boxes[0].props.options as Record<string, string>;
    expect(opts.Decimal).toBe('-255');
    expect(opts.Hexadecimal).toBe('-0xff');
    expect(opts.Octal).toBe('-0o377');
    expect(opts.Binary).toBe('-0b11111111');
  });

  it('sets box name to "Number Base"', async () => {
    const boxes = await NumberBaseBoxSource.generateBoxes('1', { base: true });
    expect(boxes[0].props.name).toBe('Number Base');
  });
});
