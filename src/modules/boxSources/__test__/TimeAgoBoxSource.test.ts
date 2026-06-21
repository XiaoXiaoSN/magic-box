import { describe, expect, it } from 'vitest';

import { TimeAgoBoxSource } from '../TimeAgoBoxSource';

describe('TimeAgoBoxSource', () => {
  it('returns [] when no option key is present', async () => {
    const boxes = await TimeAgoBoxSource.generateBoxes(
      '2000-01-01T00:00:00Z',
      null,
    );
    expect(boxes).toEqual([]);
  });

  it('returns [] when an unrelated option is present', async () => {
    const boxes = await TimeAgoBoxSource.generateBoxes('2000-01-01T00:00:00Z', {
      qrcode: true,
    });
    expect(boxes).toEqual([]);
  });

  it('shows "ago" for a clearly past date with ::timeago', async () => {
    const boxes = await TimeAgoBoxSource.generateBoxes('2000-01-01T00:00:00Z', {
      timeago: true,
    });
    expect(boxes).toHaveLength(1);
    const opts = boxes[0].props.options;
    expect(opts?.Relative).toContain('ago');
    expect(opts?.Direction).toBe('past');
    expect(opts?.ISO).toBe('2000-01-01T00:00:00.000Z');
  });

  it('shows "in" for a clearly future date with ::timeago', async () => {
    const boxes = await TimeAgoBoxSource.generateBoxes('2999-01-01T00:00:00Z', {
      timeago: true,
    });
    expect(boxes).toHaveLength(1);
    const opts = boxes[0].props.options;
    expect(opts?.Relative).toContain('in ');
    expect(opts?.Direction).toBe('future');
  });

  it('accepts ::relativetime option key', async () => {
    const boxes = await TimeAgoBoxSource.generateBoxes('2000-01-01T00:00:00Z', {
      relativetime: true,
    });
    expect(boxes).toHaveLength(1);
    expect(boxes[0].props.options?.Direction).toBe('past');
  });

  it('parses a 10-digit unix timestamp (seconds) as a past date', async () => {
    // 1577836800 = 2020-01-01T00:00:00Z in seconds (10 digits)
    const boxes = await TimeAgoBoxSource.generateBoxes('1577836800', {
      timeago: true,
    });
    expect(boxes).toHaveLength(1);
    expect(boxes[0].props.options?.Direction).toBe('past');
  });

  it('parses a 13-digit unix timestamp (milliseconds) as a past date', async () => {
    // 1577836800000 = 2020-01-01T00:00:00Z in milliseconds (13 digits)
    const boxes = await TimeAgoBoxSource.generateBoxes('1577836800000', {
      timeago: true,
    });
    expect(boxes).toHaveLength(1);
    expect(boxes[0].props.options?.Direction).toBe('past');
  });

  it('returns an error box for an invalid date string', async () => {
    const boxes = await TimeAgoBoxSource.generateBoxes('notadate', {
      timeago: true,
    });
    expect(boxes).toHaveLength(1);
    // error box carries an Error key explaining the problem
    const opts = boxes[0].props.options;
    expect(opts?.Error).toBeTruthy();
    expect((opts?.Error as string).toLowerCase()).toContain('not be parsed');
  });
});
