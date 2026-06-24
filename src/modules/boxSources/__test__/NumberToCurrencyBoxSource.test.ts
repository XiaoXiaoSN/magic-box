import { describe, expect, it } from 'vitest';
import { NumberToCurrencyBoxSource } from '../NumberToCurrencyBoxSource';

describe('NumberToCurrencyBoxSource', () => {
  it('returns [] when ::currency option is absent', async () => {
    const boxes = await NumberToCurrencyBoxSource.generateBoxes(
      '1234567.5',
      null,
    );
    expect(boxes).toEqual([]);
  });

  it('formats with USD by default when ::currency has no value', async () => {
    const boxes = await NumberToCurrencyBoxSource.generateBoxes('1234567.5', {
      currency: true,
    });
    expect(boxes).toHaveLength(1);
    const opts = boxes[0].props.options as Record<string, string>;
    expect(opts.Formatted).toBe('$1,234,567.50');
    expect(opts.Currency).toBe('USD');
    expect(opts.Plain).toBe('1,234,567.5');
  });

  it('formats with EUR when ::currency=EUR', async () => {
    const boxes = await NumberToCurrencyBoxSource.generateBoxes('1000', {
      currency: 'EUR',
    });
    expect(boxes).toHaveLength(1);
    const opts = boxes[0].props.options as Record<string, string>;
    expect(opts.Formatted).toBe('€1,000.00');
    expect(opts.Currency).toBe('EUR');
  });

  it('formats with JPY (0 decimals, rounds) when ::currency=JPY', async () => {
    const boxes = await NumberToCurrencyBoxSource.generateBoxes('1234.5', {
      currency: 'JPY',
    });
    expect(boxes).toHaveLength(1);
    const opts = boxes[0].props.options as Record<string, string>;
    expect(opts.Formatted).toBe('¥1,235');
    expect(opts.Currency).toBe('JPY');
  });

  it('returns an error box for an invalid currency code', async () => {
    // a malformed (non-3-letter) code makes Intl throw; a well-formed but
    // unknown 3-letter code like ZZZ is accepted by Intl, so use 'US'
    const boxes = await NumberToCurrencyBoxSource.generateBoxes('100', {
      currency: 'US',
    });
    expect(boxes).toHaveLength(1);
    const opts = boxes[0].props.options as Record<string, string>;
    expect(opts.Error).toMatch(/invalid currency code/i);
    expect(opts.Error).toContain('US');
  });

  it('returns [] for non-numeric input', async () => {
    const boxes = await NumberToCurrencyBoxSource.generateBoxes('abc', {
      currency: true,
    });
    expect(boxes).toEqual([]);
  });

  it('returns [] for empty input', async () => {
    const boxes = await NumberToCurrencyBoxSource.generateBoxes('', {
      currency: true,
    });
    expect(boxes).toEqual([]);
  });

  it('returns [] for input exceeding max length', async () => {
    const long = '1'.repeat(51);
    const boxes = await NumberToCurrencyBoxSource.generateBoxes(long, {
      currency: true,
    });
    expect(boxes).toEqual([]);
  });

  it('handles negative numbers', async () => {
    const boxes = await NumberToCurrencyBoxSource.generateBoxes('-500', {
      currency: true,
    });
    expect(boxes).toHaveLength(1);
    const opts = boxes[0].props.options as Record<string, string>;
    expect(opts.Formatted).toBe('-$500.00');
    expect(opts.Currency).toBe('USD');
  });

  it('uses boxTemplate KeyValueBoxTemplate', async () => {
    const { KeyValueBoxTemplate } = await import('@components/BoxTemplate');
    const boxes = await NumberToCurrencyBoxSource.generateBoxes('1', {
      currency: true,
    });
    expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
  });
});
