import { describe, expect, it } from 'vitest';
import { PasswordStrengthBoxSource } from '../PasswordStrengthBoxSource';

describe('PasswordStrengthBoxSource', () => {
  it('returns [] when no option is provided', async () => {
    const boxes = await PasswordStrengthBoxSource.generateBoxes('abc', null);
    expect(boxes).toEqual([]);
  });

  it('returns [] when option does not match', async () => {
    const boxes = await PasswordStrengthBoxSource.generateBoxes('abc', {
      other: true,
    });
    expect(boxes).toEqual([]);
  });

  it('returns [] for empty input', async () => {
    const boxes = await PasswordStrengthBoxSource.generateBoxes('', {
      strength: true,
    });
    expect(boxes).toEqual([]);
  });

  it('handles ::strength option with lowercase-only input', async () => {
    const boxes = await PasswordStrengthBoxSource.generateBoxes('abc', {
      strength: true,
    });
    expect(boxes).toHaveLength(1);
    const opts = boxes[0].props.options as Record<string, string>;
    expect(opts['Charset Size']).toBe('26');
    expect(opts.Length).toBe('3');
  });

  it('handles ::pwstrength option alias', async () => {
    const boxes = await PasswordStrengthBoxSource.generateBoxes('abc', {
      pwstrength: true,
    });
    expect(boxes).toHaveLength(1);
  });

  it('computes correct charset size for mixed aA1! input', async () => {
    const boxes = await PasswordStrengthBoxSource.generateBoxes('aA1!', {
      strength: true,
    });
    expect(boxes).toHaveLength(1);
    const opts = boxes[0].props.options as Record<string, string>;
    // lowercase(26) + uppercase(26) + digits(10) + symbols(32) = 94
    expect(opts['Charset Size']).toBe('94');
    expect(opts.Length).toBe('4');
  });

  it('rates a 20-char mixed password as Strong or Very Strong', async () => {
    // 20 chars, mixed: should yield high entropy
    const boxes = await PasswordStrengthBoxSource.generateBoxes(
      'Tr0ub4dour&3xYzQ!mN9',
      { strength: true },
    );
    expect(boxes).toHaveLength(1);
    const opts = boxes[0].props.options as Record<string, string>;
    expect(['Strong', 'Very Strong']).toContain(opts.Rating);
  });

  it('rates lowercase-only short password as Very Weak or Weak', async () => {
    // 'aaaa' with pool=26: entropy = 4 * log2(26) ≈ 18.8 → Very Weak
    const boxes = await PasswordStrengthBoxSource.generateBoxes('aaaa', {
      strength: true,
    });
    expect(boxes).toHaveLength(1);
    const opts = boxes[0].props.options as Record<string, string>;
    expect(opts['Charset Size']).toBe('26');
    expect(['Very Weak', 'Weak']).toContain(opts.Rating);
  });

  it('includes all required keys in output', async () => {
    const boxes = await PasswordStrengthBoxSource.generateBoxes('aA1!', {
      strength: true,
    });
    const opts = boxes[0].props.options as Record<string, string>;
    expect(opts).toHaveProperty('Length');
    expect(opts).toHaveProperty('Charset Size');
    expect(opts).toHaveProperty('Entropy (bits)');
    expect(opts).toHaveProperty('Rating');
  });

  it('returns [] for input exceeding MAX_INPUT', async () => {
    const long = 'a'.repeat(10_001);
    const boxes = await PasswordStrengthBoxSource.generateBoxes(long, {
      strength: true,
    });
    expect(boxes).toEqual([]);
  });
});
