import { describe, expect, it } from 'vitest';
import { VerhoeffBoxSource } from '../VerhoeffBoxSource';

describe('VerhoeffBoxSource', () => {
  it('returns [] when ::verhoeff option is absent', async () => {
    const boxes = await VerhoeffBoxSource.generateBoxes('236', null);
    expect(boxes).toEqual([]);
  });

  it('computes check digit 3 for input 236 (canonical Wikipedia example)', async () => {
    const boxes = await VerhoeffBoxSource.generateBoxes('236', {
      verhoeff: true,
    });
    expect(boxes).toHaveLength(1);
    const opts = boxes[0].props.options as Record<string, string>;
    expect(opts['Check Digit']).toBe('3');
    expect(opts.Input).toBe('236');
  });

  it('validates 2363 as true (236 + check digit 3)', async () => {
    const boxes = await VerhoeffBoxSource.generateBoxes('2363', {
      verhoeff: true,
    });
    expect(boxes).toHaveLength(1);
    const opts = boxes[0].props.options as Record<string, string>;
    expect(opts.Valid).toBe('true');
  });

  it('validates 2364 as false', async () => {
    const boxes = await VerhoeffBoxSource.generateBoxes('2364', {
      verhoeff: true,
    });
    expect(boxes).toHaveLength(1);
    const opts = boxes[0].props.options as Record<string, string>;
    expect(opts.Valid).toBe('false');
  });

  it('computes check digit 1 for input 12345', async () => {
    const boxes = await VerhoeffBoxSource.generateBoxes('12345', {
      verhoeff: true,
    });
    expect(boxes).toHaveLength(1);
    const opts = boxes[0].props.options as Record<string, string>;
    expect(opts['Check Digit']).toBe('1');
  });

  it('returns an error box for non-digit input', async () => {
    const boxes = await VerhoeffBoxSource.generateBoxes('abc', {
      verhoeff: true,
    });
    expect(boxes).toHaveLength(1);
    const opts = boxes[0].props.options as Record<string, string>;
    expect(opts.Error).toBeDefined();
  });
});
