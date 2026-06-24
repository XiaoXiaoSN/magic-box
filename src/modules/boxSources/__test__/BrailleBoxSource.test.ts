import { describe, expect, it } from 'vitest';
import { BrailleBoxSource } from '../BrailleBoxSource';

describe('BrailleBoxSource', () => {
  it('returns [] when no option present', async () => {
    expect(await BrailleBoxSource.generateBoxes('abc', null)).toHaveLength(0);
  });

  it('returns [] for empty input', async () => {
    expect(
      await BrailleBoxSource.generateBoxes('', { braille: true }),
    ).toHaveLength(0);
  });

  it('encodes "abc" to ⠁⠃⠉ (U+2801 U+2803 U+2809)', async () => {
    const boxes = await BrailleBoxSource.generateBoxes('abc', {
      braille: true,
    });
    const out = boxes[0].props.plaintextOutput;
    expect(out).toBe('⠁⠃⠉');
    const cps = [...out].map((c) => c.codePointAt(0));
    expect(cps).toEqual([0x2801, 0x2803, 0x2809]);
  });

  it('encodes "hello" to ⠓⠑⠇⠇⠕', async () => {
    const boxes = await BrailleBoxSource.generateBoxes('hello', {
      braille: true,
    });
    expect(boxes[0].props.plaintextOutput).toBe('⠓⠑⠇⠇⠕');
  });

  it('maps a space to U+2800', async () => {
    const boxes = await BrailleBoxSource.generateBoxes('a b', {
      braille: true,
    });
    const out = boxes[0].props.plaintextOutput;
    expect([...out][1].codePointAt(0)).toBe(0x2800);
  });

  it('decodes ⠓⠑⠇⠇⠕ back to "hello"', async () => {
    const boxes = await BrailleBoxSource.generateBoxes('⠓⠑⠇⠇⠕', {
      brailledecode: true,
    });
    expect(boxes[0].props.plaintextOutput).toBe('hello');
  });

  it('round-trips "the quick brown fox"', async () => {
    const text = 'the quick brown fox';
    const enc = await BrailleBoxSource.generateBoxes(text, { braille: true });
    const encoded = enc[0].props.plaintextOutput;
    const dec = await BrailleBoxSource.generateBoxes(encoded, {
      brailledecode: true,
    });
    expect(dec[0].props.plaintextOutput).toBe(text);
  });

  it('returns 2 boxes when both options are set', async () => {
    const boxes = await BrailleBoxSource.generateBoxes('abc', {
      braille: true,
      brailledecode: true,
    });
    expect(boxes).toHaveLength(2);
  });

  it('has the expected static metadata', () => {
    expect(BrailleBoxSource.tag).toBe('#');
    expect(BrailleBoxSource.kind).toBe('Encode');
    expect(typeof BrailleBoxSource.priority).toBe('number');
  });
});
