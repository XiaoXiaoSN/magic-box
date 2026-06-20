import { describe, expect, it } from 'vitest';
import { IPv6BoxSource } from '../IPv6BoxSource';

describe('IPv6BoxSource', () => {
  it('returns [] when no ::ipv6 option is provided', async () => {
    const boxes = await IPv6BoxSource.generateBoxes('2001:db8::1', null);
    expect(boxes).toEqual([]);
  });

  it('returns [] when options object has no ipv6 key', async () => {
    const boxes = await IPv6BoxSource.generateBoxes('2001:db8::1', {
      other: true,
    });
    expect(boxes).toEqual([]);
  });

  it('expands and compresses 2001:db8::1', async () => {
    const boxes = await IPv6BoxSource.generateBoxes('2001:db8::1', {
      ipv6: true,
    });
    expect(boxes).toHaveLength(1);
    const opts = boxes[0].props.options as Record<string, string>;
    expect(opts.Expanded).toBe('2001:0db8:0000:0000:0000:0000:0000:0001');
    expect(opts.Compressed).toBe('2001:db8::1');
  });

  it('expands ::1 correctly', async () => {
    const boxes = await IPv6BoxSource.generateBoxes('::1', { ipv6: true });
    expect(boxes).toHaveLength(1);
    const opts = boxes[0].props.options as Record<string, string>;
    expect(opts.Expanded).toBe('0000:0000:0000:0000:0000:0000:0000:0001');
    expect(opts.Compressed).toBe('::1');
  });

  it('compresses fe80:0:0:0:0:0:0:1 to fe80::1', async () => {
    const boxes = await IPv6BoxSource.generateBoxes('fe80:0:0:0:0:0:0:1', {
      ipv6: true,
    });
    expect(boxes).toHaveLength(1);
    const opts = boxes[0].props.options as Record<string, string>;
    expect(opts.Compressed).toBe('fe80::1');
  });

  it('does not add :: when no run of ≥2 zero groups exists', async () => {
    // address has at most one consecutive zero group anywhere
    const addr = '2001:db8:0:1:2:3:4:5';
    const boxes = await IPv6BoxSource.generateBoxes(addr, { ipv6: true });
    expect(boxes).toHaveLength(1);
    const opts = boxes[0].props.options as Record<string, string>;
    // no :: should appear in compressed form
    expect(opts.Compressed).not.toContain('::');
    expect(opts.Compressed).toBe('2001:db8:0:1:2:3:4:5');
  });

  it('returns [] for invalid address xyz', async () => {
    const boxes = await IPv6BoxSource.generateBoxes('xyz', { ipv6: true });
    expect(boxes).toEqual([]);
  });

  it('returns [] for group too long (12345::1)', async () => {
    const boxes = await IPv6BoxSource.generateBoxes('12345::1', { ipv6: true });
    expect(boxes).toEqual([]);
  });

  it('returns [] for too few groups with no :: (1:2:3)', async () => {
    const boxes = await IPv6BoxSource.generateBoxes('1:2:3', { ipv6: true });
    expect(boxes).toEqual([]);
  });

  it('RFC 5952 longest-run: picks second run (length 3) over first (length 2)', async () => {
    // 2001:0:0:1:0:0:0:1 — first run of zeros is length 2 (groups 1-2),
    // second run of zeros is length 3 (groups 4-6). longest wins → compress second run.
    const boxes = await IPv6BoxSource.generateBoxes('2001:0:0:1:0:0:0:1', {
      ipv6: true,
    });
    expect(boxes).toHaveLength(1);
    const opts = boxes[0].props.options as Record<string, string>;
    expect(opts.Compressed).toBe('2001:0:0:1::1');
  });

  it('box has correct name and priority', async () => {
    const boxes = await IPv6BoxSource.generateBoxes('::1', { ipv6: true });
    expect(boxes[0].props.name).toBe('IPv6');
    expect(boxes[0].props.priority).toBe(20);
  });

  it('rejects :: that represents zero groups (RFC 4291)', async () => {
    // both halves already total 8 groups, so :: stands for nothing — invalid
    for (const bad of ['1:2:3:4:5:6:7:8::', '1:2:3:4:5:6::7:8']) {
      const boxes = await IPv6BoxSource.generateBoxes(bad, { ipv6: true });
      expect(boxes).toHaveLength(0);
    }
  });

  it('handles :: (unspecified address)', async () => {
    const boxes = await IPv6BoxSource.generateBoxes('::', { ipv6: true });
    const opts = boxes[0].props.options as Record<string, string>;
    expect(opts.Expanded).toBe('0000:0000:0000:0000:0000:0000:0000:0000');
    expect(opts.Compressed).toBe('::');
  });
});
