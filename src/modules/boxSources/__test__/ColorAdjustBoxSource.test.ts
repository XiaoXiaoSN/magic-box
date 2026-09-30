import { describe, expect, it } from 'vitest';

import { ColorAdjustBoxSource } from '../ColorAdjustBoxSource';

describe('ColorAdjustBoxSource.generateBoxes', () => {
  it('returns [] when no lighten/darken option is present', async () => {
    const boxes = await ColorAdjustBoxSource.generateBoxes('#ff6347', null);
    expect(boxes).toHaveLength(0);
  });

  it('returns [] for invalid color input', async () => {
    const boxes = await ColorAdjustBoxSource.generateBoxes('notacolor', {
      lighten: '20',
    });
    expect(boxes).toHaveLength(0);
  });

  it('#000000 + ::lighten=50 → Adjusted #808080 (L 0%→50%)', async () => {
    const boxes = await ColorAdjustBoxSource.generateBoxes('#000000', {
      lighten: '50',
    });
    expect(boxes).toHaveLength(1);
    const opts = boxes[0].props.options as Record<string, string>;
    expect(opts.Original).toBe('#000000');
    expect(opts.Adjusted).toBe('#808080');
    expect(opts.Operation).toBe('lighten 50%');
  });

  it('#ffffff + ::darken=100 → Adjusted #000000', async () => {
    const boxes = await ColorAdjustBoxSource.generateBoxes('#ffffff', {
      darken: '100',
    });
    expect(boxes).toHaveLength(1);
    const opts = boxes[0].props.options as Record<string, string>;
    expect(opts.Adjusted).toBe('#000000');
    expect(opts.Operation).toBe('darken 100%');
  });

  it('#ff6347 + ::lighten=0 → Adjusted equals original', async () => {
    const boxes = await ColorAdjustBoxSource.generateBoxes('#ff6347', {
      lighten: '0',
    });
    expect(boxes).toHaveLength(1);
    const opts = boxes[0].props.options as Record<string, string>;
    expect(opts.Original).toBe('#ff6347');
    expect(opts.Adjusted).toBe('#ff6347');
  });

  it('short hex #f00 + ::darken=0 → Original #ff0000', async () => {
    const boxes = await ColorAdjustBoxSource.generateBoxes('#f00', {
      darken: '0',
    });
    expect(boxes).toHaveLength(1);
    const opts = boxes[0].props.options as Record<string, string>;
    expect(opts.Original).toBe('#ff0000');
  });

  it('lighten takes precedence when both lighten and darken are present', async () => {
    const boxes = await ColorAdjustBoxSource.generateBoxes('#808080', {
      lighten: '10',
      darken: '10',
    });
    expect(boxes).toHaveLength(1);
    const opts = boxes[0].props.options as Record<string, string>;
    expect(opts.Operation).toMatch(/^lighten/);
  });

  it('box uses KeyValueBoxTemplate and correct priority', async () => {
    const boxes = await ColorAdjustBoxSource.generateBoxes('#ff0000', {
      lighten: '10',
    });
    expect(boxes).toHaveLength(1);
    expect(boxes[0].props.priority).toBe(10);
    expect(boxes[0].boxTemplate).toBeDefined();
  });
});
