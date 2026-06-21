import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { Ipv6BoxSource } from '../Ipv6BoxSource';

describe('Ipv6BoxSource', () => {
  describe('generateBoxes — guard conditions', () => {
    it('returns [] when no ipv6 option is provided', async () => {
      const boxes = await Ipv6BoxSource.generateBoxes('2001:db8::1', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when options is empty object (no ipv6 key)', async () => {
      const boxes = await Ipv6BoxSource.generateBoxes('2001:db8::1', {});
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes — valid addresses', () => {
    it('expands and compresses 2001:db8::1', async () => {
      const boxes = await Ipv6BoxSource.generateBoxes('2001:db8::1', {
        ipv6: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Expanded).toBe('2001:0db8:0000:0000:0000:0000:0000:0001');
      expect(opts.Compressed).toBe('2001:db8::1');
    });

    it('compresses an already-expanded address back to canonical form', async () => {
      const boxes = await Ipv6BoxSource.generateBoxes(
        '2001:0db8:0000:0000:0000:0000:0000:0001',
        { ipv6: true },
      );
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Expanded).toBe('2001:0db8:0000:0000:0000:0000:0000:0001');
      expect(opts.Compressed).toBe('2001:db8::1');
    });

    it('handles loopback address ::1', async () => {
      const boxes = await Ipv6BoxSource.generateBoxes('::1', { ipv6: true });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Expanded).toBe('0000:0000:0000:0000:0000:0000:0000:0001');
      expect(opts.Compressed).toBe('::1');
    });

    it('handles all-zeros address ::', async () => {
      const boxes = await Ipv6BoxSource.generateBoxes('::', { ipv6: true });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Expanded).toBe('0000:0000:0000:0000:0000:0000:0000:0000');
      expect(opts.Compressed).toBe('::');
    });

    it('RFC 5952 longest-run rule: 2001:db8:0:0:1:0:0:1 compresses to 2001:db8::1:0:0:1', async () => {
      // the first zero-run (positions 2-3) is length 2
      // the second zero-run (positions 5-6) is also length 2
      // leftmost wins on tie → compress positions 2-3
      const boxes = await Ipv6BoxSource.generateBoxes('2001:db8:0:0:1:0:0:1', {
        ipv6: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Expanded).toBe('2001:0db8:0000:0000:0001:0000:0000:0001');
      expect(opts.Compressed).toBe('2001:db8::1:0:0:1');
    });

    it('normalizes uppercase input to lowercase', async () => {
      const boxes = await Ipv6BoxSource.generateBoxes('2001:DB8::1', {
        ipv6: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Expanded).toBe('2001:0db8:0000:0000:0000:0000:0000:0001');
      expect(opts.Compressed).toBe('2001:db8::1');
    });

    it('uses KeyValueBoxTemplate', async () => {
      const boxes = await Ipv6BoxSource.generateBoxes('::1', { ipv6: true });
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
    });

    it('sets priority to 10', async () => {
      const boxes = await Ipv6BoxSource.generateBoxes('::1', { ipv6: true });
      expect(boxes[0].props.priority).toBe(10);
    });

    it('box name is IPv6', async () => {
      const boxes = await Ipv6BoxSource.generateBoxes('::1', { ipv6: true });
      expect(boxes[0].props.name).toBe('IPv6');
    });
  });

  describe('generateBoxes — round-trip verify', () => {
    it('expand then re-compress gives same compressed form', async () => {
      const addr = '2001:db8::1';
      const boxes = await Ipv6BoxSource.generateBoxes(addr, { ipv6: true });
      const opts = boxes[0].props.options as Record<string, string>;

      // re-parse the expanded form
      const boxes2 = await Ipv6BoxSource.generateBoxes(opts.Expanded, {
        ipv6: true,
      });
      const opts2 = boxes2[0].props.options as Record<string, string>;

      expect(opts2.Compressed).toBe(opts.Compressed);
    });
  });

  describe('generateBoxes — invalid addresses', () => {
    it('returns an error box for "hello"', async () => {
      const boxes = await Ipv6BoxSource.generateBoxes('hello', { ipv6: true });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Error).toMatch(/not a valid ipv6 address/i);
    });

    it('returns an error box for "2001:db8:::1" (triple colon)', async () => {
      const boxes = await Ipv6BoxSource.generateBoxes('2001:db8:::1', {
        ipv6: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Error).toBeDefined();
    });

    it('returns an error box for "gggg::1" (invalid hex)', async () => {
      const boxes = await Ipv6BoxSource.generateBoxes('gggg::1', {
        ipv6: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Error).toMatch(/not a valid ipv6 address/i);
    });

    it('returns an error box for embedded IPv4', async () => {
      const boxes = await Ipv6BoxSource.generateBoxes('::ffff:192.168.1.1', {
        ipv6: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Error).toMatch(/ipv4/i);
    });
  });
});
