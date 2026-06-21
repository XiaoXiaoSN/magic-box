import { describe, expect, it } from 'vitest';
import { InvisibleCharsBoxSource } from '../InvisibleCharsBoxSource';

describe('InvisibleCharsBoxSource', () => {
  it('returns [] when no option is provided', async () => {
    const boxes = await InvisibleCharsBoxSource.generateBoxes(
      'hello​world',
      null,
    );
    expect(boxes).toEqual([]);
  });

  it('returns [] when an unrelated option is provided', async () => {
    const boxes = await InvisibleCharsBoxSource.generateBoxes('hello​world', {
      base64: true,
    });
    expect(boxes).toEqual([]);
  });

  it('returns [] for empty input', async () => {
    const boxes = await InvisibleCharsBoxSource.generateBoxes('', {
      invisibles: true,
    });
    expect(boxes).toEqual([]);
  });

  it('detects zero-width space U+200B with ::invisibles', async () => {
    // 'hello​world' contains U+200B between hello and world
    const boxes = await InvisibleCharsBoxSource.generateBoxes('hello​world', {
      invisibles: true,
    });
    expect(boxes).toHaveLength(1);
    const output = boxes[0].props.plaintextOutput;
    expect(output).toContain('U+200B');
    expect(output).toContain('hello[U+200B]world');
  });

  it('detects zero-width space with ::hiddenchars alias', async () => {
    const boxes = await InvisibleCharsBoxSource.generateBoxes('hello​world', {
      hiddenchars: true,
    });
    expect(boxes).toHaveLength(1);
    expect(boxes[0].props.plaintextOutput).toContain('U+200B');
  });

  it('detects non-breaking space U+00A0 (NBSP)', async () => {
    // 'a b' — non-breaking space between a and b
    const boxes = await InvisibleCharsBoxSource.generateBoxes('a b', {
      invisibles: true,
    });
    expect(boxes).toHaveLength(1);
    const output = boxes[0].props.plaintextOutput;
    expect(output).toContain('U+00A0');
    expect(output).toContain('NO-BREAK SPACE');
  });

  it('reports no invisible characters for clean ASCII', async () => {
    const boxes = await InvisibleCharsBoxSource.generateBoxes('hello world', {
      invisibles: true,
    });
    expect(boxes).toHaveLength(1);
    expect(boxes[0].props.plaintextOutput).toBe(
      'No invisible characters found.',
    );
  });

  it('does not flag visible unicode letters and emoji (café 😀)', async () => {
    const boxes = await InvisibleCharsBoxSource.generateBoxes('café 😀', {
      invisibles: true,
    });
    expect(boxes).toHaveLength(1);
    expect(boxes[0].props.plaintextOutput).toBe(
      'No invisible characters found.',
    );
  });

  it('detects BOM U+FEFF', async () => {
    const boxes = await InvisibleCharsBoxSource.generateBoxes('﻿hello', {
      invisibles: true,
    });
    expect(boxes).toHaveLength(1);
    const output = boxes[0].props.plaintextOutput;
    expect(output).toContain('U+FEFF');
    expect(output).toContain('BYTE ORDER MARK');
  });

  it('counts multiple occurrences of the same invisible char', async () => {
    const boxes = await InvisibleCharsBoxSource.generateBoxes('a​b​c', {
      invisibles: true,
    });
    expect(boxes).toHaveLength(1);
    const output = boxes[0].props.plaintextOutput;
    // count should be 2
    expect(output).toContain('ZERO WIDTH SPACE (U+200B): 2');
  });

  it('revealed text replaces each invisible char with its token', async () => {
    const boxes = await InvisibleCharsBoxSource.generateBoxes('x‌y‍z', {
      invisibles: true,
    });
    expect(boxes).toHaveLength(1);
    const output = boxes[0].props.plaintextOutput;
    expect(output).toContain('x[U+200C]y[U+200D]z');
  });

  it('allows normal tab, newline, and carriage return', async () => {
    const boxes = await InvisibleCharsBoxSource.generateBoxes('a\tb\nc\rd', {
      invisibles: true,
    });
    expect(boxes).toHaveLength(1);
    expect(boxes[0].props.plaintextOutput).toBe(
      'No invisible characters found.',
    );
  });
});
