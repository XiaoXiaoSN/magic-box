import { describe, expect, it } from 'vitest';
import { CaesarBoxSource } from '../CaesarBoxSource';

describe('CaesarBoxSource', () => {
  it('returns [] with no options', async () => {
    const boxes = await CaesarBoxSource.generateBoxes('Hello', null);
    expect(boxes).toHaveLength(0);
  });

  it('returns [] for empty input', async () => {
    const boxes = await CaesarBoxSource.generateBoxes('', { caesar: '3' });
    expect(boxes).toHaveLength(0);
  });

  it('returns [] for whitespace-only input', async () => {
    const boxes = await CaesarBoxSource.generateBoxes('   ', { caesar: '3' });
    expect(boxes).toHaveLength(0);
  });

  it('shifts Hello by 3 → Khoor', async () => {
    const boxes = await CaesarBoxSource.generateBoxes('Hello', { caesar: '3' });
    expect(boxes).toHaveLength(1);
    expect(boxes[0].props.plaintextOutput).toBe('Khoor');
  });

  it('shifts Khoor by -3 → Hello', async () => {
    const boxes = await CaesarBoxSource.generateBoxes('Khoor', {
      caesar: '-3',
    });
    expect(boxes).toHaveLength(1);
    expect(boxes[0].props.plaintextOutput).toBe('Hello');
  });

  it('wraps around: xyz + 3 → abc', async () => {
    const boxes = await CaesarBoxSource.generateBoxes('xyz', { caesar: '3' });
    expect(boxes).toHaveLength(1);
    expect(boxes[0].props.plaintextOutput).toBe('abc');
  });

  it('preserves case and punctuation: Hello, World! + 1 → Ifmmp, Xpsme!', async () => {
    const boxes = await CaesarBoxSource.generateBoxes('Hello, World!', {
      caesar: '1',
    });
    expect(boxes).toHaveLength(1);
    expect(boxes[0].props.plaintextOutput).toBe('Ifmmp, Xpsme!');
  });

  it('defaults to shift 3 when ::caesar has no numeric value', async () => {
    // boolean true simulates ::caesar with no =value
    const boxes = await CaesarBoxSource.generateBoxes('abc', { caesar: true });
    expect(boxes).toHaveLength(1);
    expect(boxes[0].props.plaintextOutput).toBe('def');
  });

  it('caesarcrack output contains Hello when cracking Khoor', async () => {
    const boxes = await CaesarBoxSource.generateBoxes('Khoor', {
      caesarcrack: true,
    });
    expect(boxes).toHaveLength(1);
    expect(boxes[0].props.name).toBe('Caesar Cipher (all shifts)');
    // shift 23 reverses a +3 shift (26-3=23)
    expect(boxes[0].props.plaintextOutput).toContain('shift 23: Hello');
  });

  it('caesarcrack output contains all 25 shift lines', async () => {
    const boxes = await CaesarBoxSource.generateBoxes('A', {
      caesarcrack: true,
    });
    const lines = boxes[0].props.plaintextOutput.split('\n');
    expect(lines).toHaveLength(25);
    expect(lines[0]).toMatch(/^shift 1: /);
    expect(lines[24]).toMatch(/^shift 25: /);
  });

  it('caesarbrute is accepted as an alias for caesarcrack', async () => {
    const boxes = await CaesarBoxSource.generateBoxes('Hello', {
      caesarbrute: true,
    });
    expect(boxes).toHaveLength(1);
    expect(boxes[0].props.name).toBe('Caesar Cipher (all shifts)');
  });

  it('both ::caesar=3 and ::caesarcrack returns 2 boxes, caesar first', async () => {
    const boxes = await CaesarBoxSource.generateBoxes('Hello', {
      caesar: '3',
      caesarcrack: true,
    });
    expect(boxes).toHaveLength(2);
    expect(boxes[0].props.name).toBe('Caesar Cipher');
    expect(boxes[0].props.plaintextOutput).toBe('Khoor');
    expect(boxes[1].props.name).toBe('Caesar Cipher (all shifts)');
  });

  it('single-shift box has showExpandButton=false', async () => {
    const boxes = await CaesarBoxSource.generateBoxes('Hello', { caesar: '3' });
    expect(boxes[0].props.showExpandButton).toBe(false);
  });

  it('priority is set on both box types', async () => {
    const boxes = await CaesarBoxSource.generateBoxes('Hello', {
      caesar: '3',
      caesarcrack: true,
    });
    for (const box of boxes) {
      expect(box.props.priority).toBe(10);
    }
  });
});
