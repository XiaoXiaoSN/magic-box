// @vitest-environment node

import { parseInput } from '@functions/parseOptions';
import { describe, expect, it } from 'vitest';

import { CountryFlagBoxSource } from '../CountryFlagBoxSource';
import { getBoxSource } from '../index';

const convert = (input: string) =>
  CountryFlagBoxSource.generateBoxes(input, { flag: true });

describe('Country Flag', () => {
  it('requires an owned directive', async () => {
    expect(await CountryFlagBoxSource.generateBoxes('US')).toEqual([]);
    expect(
      await CountryFlagBoxSource.generateBoxes('US', { qrcode: true }),
    ).toEqual([]);
  });

  it.each([
    ['US', '🇺🇸', 'United States'],
    ['jp', '🇯🇵', 'Japan'],
    [' TW ', '🇹🇼', 'Taiwan'],
    ['BW', '🇧🇼', 'Botswana'],
    ['AX', '🇦🇽', 'Åland Islands'],
  ])('converts %s with full plaintext and semantic presentation', async (input, flag, name) => {
    const [box] = await convert(input);
    const code = input.trim().toUpperCase();
    expect(box.props.options).toEqual({ Code: code, Flag: flag, Name: name });
    expect(box.props.plaintextOutput).toBe(
      `Code: ${code}\nFlag: ${flag}\nName: ${name}`,
    );
    expect(box.view).toBe('keyValue');
    expect(box.boxTemplate).toBeUndefined();
  });

  it.each(['🇺🇸', '🇫🇷', '🇧🇼', '🇹🇼'])('round-trips %s', async (flag) => {
    const [reverse] = await convert(flag);
    expect(reverse.props.isError).not.toBe(true);
    const code = reverse.props.options?.Code;
    if (typeof code !== 'string') throw new Error('Missing country code');
    const [forward] = await convert(code);
    expect(forward.props.options).toEqual(reverse.props.options);
    expect(forward.props.options?.Flag).toBe(flag);
  });

  it.each([
    '',
    '   ',
    'ZZ',
    'AA',
    'EU',
    'UK',
    'XK',
    'USA',
    '1A',
    '🇿🇿',
    '🇺',
    '🇺🇸🇫🇷',
    'hello 🇺🇸',
    '🇺hello🇸',
    '🇺 🇸',
    '🏳️',
  ])('reports invalid country input: %s', async (input) => {
    const [box] = await convert(input);
    expect(box.props.isError).toBe(true);
    expect(box.props.plaintextOutput).toContain('ISO 3166-1');
    expect(box.view).not.toBe('keyValue');
  });

  it('rejects oversized input before scanning indicators', async () => {
    const [box] = await convert('🇺'.repeat(100_000));
    expect(box.props.isError).toBe(true);
  });

  it('accepts all 249 assigned codes and rejects other letter pairs in both directions', async () => {
    let accepted = 0;
    for (let first = 65; first <= 90; first += 1) {
      for (let second = 65; second <= 90; second += 1) {
        const code = String.fromCharCode(first, second);
        const flag = String.fromCodePoint(
          0x1f1e6 + first - 65,
          0x1f1e6 + second - 65,
        );
        const [forward] = await convert(code);
        const [reverse] = await convert(flag);
        expect(reverse.props.isError).toBe(forward.props.isError);
        if (!forward.props.isError) {
          accepted += 1;
          expect(forward.props.options?.Name).not.toBe(code);
          expect(forward.props.options?.Flag).toBe(flag);
          expect(reverse.props.options).toEqual(forward.props.options);
        }
      }
    }
    expect(accepted).toBe(249);
  });

  it('runs its default and alias through the lazy headless registry', async () => {
    const source = getBoxSource('country-flag');
    expect(source?.headless).toBe(true);
    for (const raw of [
      CountryFlagBoxSource.defaultInput,
      '🇺🇸\n::countryflag',
    ]) {
      const [input, options] = parseInput(raw);
      expect(source?.canHandle?.(input, options)).toBe(true);
      const boxes = await source?.generateBoxes(input, options);
      expect(boxes).toHaveLength(1);
      expect(boxes?.[0].props.options?.Code).toBe('US');
    }
    expect(await source?.generateBoxes('US', null)).toEqual([]);
  });
});
