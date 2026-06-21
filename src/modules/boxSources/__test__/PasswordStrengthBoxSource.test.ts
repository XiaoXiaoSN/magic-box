import { PasswordStrengthBoxSource } from '@modules/boxSources/PasswordStrengthBoxSource';
import { describe, expect, it } from 'vitest';

describe('PasswordStrengthBoxSource', () => {
  it('returns [] when no option key is present', async () => {
    const boxes = await PasswordStrengthBoxSource.generateBoxes('abc', null);
    expect(boxes).toHaveLength(0);
  });

  it('returns [] for empty input even with ::strength', async () => {
    const boxes = await PasswordStrengthBoxSource.generateBoxes('', {
      strength: true,
    });
    expect(boxes).toHaveLength(0);
  });

  it('returns [] for input exceeding MAX_INPUT', async () => {
    const boxes = await PasswordStrengthBoxSource.generateBoxes(
      'a'.repeat(10_001),
      { strength: true },
    );
    expect(boxes).toHaveLength(0);
  });

  it('accepts ::pwstrength as trigger', async () => {
    const boxes = await PasswordStrengthBoxSource.generateBoxes('abc', {
      pwstrength: true,
    });
    expect(boxes).toHaveLength(1);
  });

  describe("'abc' with ::strength", () => {
    it('produces correct Length, Character Set, Pool Size, and Entropy', async () => {
      const boxes = await PasswordStrengthBoxSource.generateBoxes('abc', {
        strength: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Length).toBe('3');
      expect(opts['Character Set']).toContain('lowercase');
      expect(opts['Character Set']).not.toContain('uppercase');
      expect(opts['Character Set']).not.toContain('digits');
      expect(opts['Pool Size']).toBe('26');

      // entropy = 3 * log2(26) ≈ 14.1 bits
      const expectedBits = 3 * Math.log2(26);
      expect(opts.Entropy).toBe(`${expectedBits.toFixed(1)} bits`);
      // 14.1 < 28, so rating must be Very Weak
      expect(opts.Rating).toBe('Very Weak');
    });
  });

  describe("'P@ssw0rd123' with ::strength", () => {
    it('detects lowercase, uppercase, digits, and symbols; pool 95; has a Rating', async () => {
      const boxes = await PasswordStrengthBoxSource.generateBoxes(
        'P@ssw0rd123',
        { strength: true },
      );
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Character Set']).toContain('lowercase');
      expect(opts['Character Set']).toContain('uppercase');
      expect(opts['Character Set']).toContain('digits');
      expect(opts['Character Set']).toContain('symbols');
      // pool = 26+26+10+33 = 95
      expect(opts['Pool Size']).toBe('95');
      expect(opts.Rating).toBeTruthy();
    });

    it('does NOT echo the password in any option value', async () => {
      const password = 'P@ssw0rd123';
      const boxes = await PasswordStrengthBoxSource.generateBoxes(password, {
        strength: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      for (const value of Object.values(opts)) {
        expect(value).not.toBe(password);
      }
    });
  });

  describe("'Tr0ub4dour&3xtra!Longg' with ::strength", () => {
    it('rates as Strong or Very Strong', async () => {
      const boxes = await PasswordStrengthBoxSource.generateBoxes(
        'Tr0ub4dour&3xtra!Longg',
        { strength: true },
      );
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(['Strong', 'Very Strong']).toContain(opts.Rating);
    });
  });

  it('entropy equals length * log2(poolSize)', async () => {
    // 'abc' → pool=26, length=3
    const boxes = await PasswordStrengthBoxSource.generateBoxes('abc', {
      strength: true,
    });
    const opts = boxes[0].props.options as Record<string, string>;
    const length = Number.parseInt(opts.Length, 10);
    const pool = Number.parseInt(opts['Pool Size'], 10);
    const expected = `${(length * Math.log2(pool)).toFixed(1)} bits`;
    expect(opts.Entropy).toBe(expected);
  });

  it('space character counts as its own pool class', async () => {
    const boxes = await PasswordStrengthBoxSource.generateBoxes('a b', {
      strength: true,
    });
    expect(boxes).toHaveLength(1);
    const opts = boxes[0].props.options as Record<string, string>;
    expect(opts['Character Set']).toContain('space');
    // pool = 26 (lower) + 1 (space) = 27
    expect(opts['Pool Size']).toBe('27');
  });
});
