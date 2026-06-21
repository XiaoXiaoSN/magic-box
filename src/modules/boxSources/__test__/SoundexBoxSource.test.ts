import { describe, expect, it } from 'vitest';
import { SoundexBoxSource } from '../SoundexBoxSource';

describe('SoundexBoxSource', () => {
  it('returns [] when soundex option is absent', async () => {
    const boxes = await SoundexBoxSource.generateBoxes('Robert', null);
    expect(boxes).toEqual([]);
  });

  it('returns [] when soundex option is absent with other options', async () => {
    const boxes = await SoundexBoxSource.generateBoxes('Robert', {
      locale: 'en',
    });
    expect(boxes).toEqual([]);
  });

  it('returns [] for input with no letters', async () => {
    const boxes = await SoundexBoxSource.generateBoxes('123 456', {
      soundex: true,
    });
    expect(boxes).toEqual([]);
  });

  it('Robert → R163', async () => {
    const boxes = await SoundexBoxSource.generateBoxes('Robert', {
      soundex: true,
    });
    expect(boxes).toHaveLength(1);
    const opts = boxes[0].props.options as Record<string, string>;
    expect(opts.Robert).toBe('R163');
  });

  it('Rupert → R163 (same code as Robert)', async () => {
    const boxes = await SoundexBoxSource.generateBoxes('Rupert', {
      soundex: true,
    });
    const opts = boxes[0].props.options as Record<string, string>;
    expect(opts.Rupert).toBe('R163');
  });

  it('Ashcraft → A261 (H between same-code letters collapses to one code)', async () => {
    const boxes = await SoundexBoxSource.generateBoxes('Ashcraft', {
      soundex: true,
    });
    const opts = boxes[0].props.options as Record<string, string>;
    expect(opts.Ashcraft).toBe('A261');
  });

  it('Tymczak → T522 (Z and K separated by nothing, then final K separate code)', async () => {
    const boxes = await SoundexBoxSource.generateBoxes('Tymczak', {
      soundex: true,
    });
    const opts = boxes[0].props.options as Record<string, string>;
    expect(opts.Tymczak).toBe('T522');
  });

  it('Pfister → P236 (adjacent P,F both code 1 → collapse)', async () => {
    const boxes = await SoundexBoxSource.generateBoxes('Pfister', {
      soundex: true,
    });
    const opts = boxes[0].props.options as Record<string, string>;
    expect(opts.Pfister).toBe('P236');
  });

  it('Honeyman → H555', async () => {
    const boxes = await SoundexBoxSource.generateBoxes('Honeyman', {
      soundex: true,
    });
    const opts = boxes[0].props.options as Record<string, string>;
    expect(opts.Honeyman).toBe('H555');
  });

  it('multiple words produce one box with one key per word', async () => {
    const boxes = await SoundexBoxSource.generateBoxes('Robert Rupert', {
      soundex: true,
    });
    expect(boxes).toHaveLength(1);
    const opts = boxes[0].props.options as Record<string, string>;
    expect(opts.Robert).toBe('R163');
    expect(opts.Rupert).toBe('R163');
  });
});
