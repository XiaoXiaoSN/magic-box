import { describe, expect, it } from 'vitest';

import { MacAddressBoxSource } from '../MacAddressBoxSource';

describe('MacAddressBoxSource', () => {
  describe('no option', () => {
    it('returns [] when no mac option is provided', async () => {
      const boxes = await MacAddressBoxSource.generateBoxes(
        '00:1B:44:11:3A:B7',
        null,
      );
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for empty options object', async () => {
      const boxes = await MacAddressBoxSource.generateBoxes(
        '00:1B:44:11:3A:B7',
        {},
      );
      expect(boxes).toHaveLength(0);
    });
  });

  describe('colon format', () => {
    it('normalizes colon-separated MAC to all formats', async () => {
      const boxes = await MacAddressBoxSource.generateBoxes(
        '00:1B:44:11:3A:B7',
        { mac: true },
      );
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Colon).toBe('00:1b:44:11:3a:b7');
      expect(opts.Hyphen).toBe('00-1b-44-11-3a-b7');
      expect(opts.Dot).toBe('001b.4411.3ab7');
      expect(opts.Bare).toBe('001b44113ab7');
    });
  });

  describe('hyphen format', () => {
    it('accepts hyphen-separated input and produces same colon output', async () => {
      const boxes = await MacAddressBoxSource.generateBoxes(
        '00-1b-44-11-3a-b7',
        { mac: true },
      );
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Colon).toBe('00:1b:44:11:3a:b7');
    });
  });

  describe('bare format', () => {
    it('accepts bare 12-digit hex input', async () => {
      const boxes = await MacAddressBoxSource.generateBoxes('001B44113AB7', {
        mac: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Colon).toBe('00:1b:44:11:3a:b7');
      expect(opts.Bare).toBe('001b44113ab7');
    });
  });

  describe('cisco dot format', () => {
    it('accepts cisco-style dot-separated input', async () => {
      const boxes = await MacAddressBoxSource.generateBoxes('001b.4411.3ab7', {
        macaddress: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Colon).toBe('00:1b:44:11:3a:b7');
    });
  });

  describe('Type field', () => {
    it('reports unicast + universal for 0x00 first octet', async () => {
      const boxes = await MacAddressBoxSource.generateBoxes(
        '00:1b:44:11:3a:b7',
        { mac: true },
      );
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Type).toBe('unicast, universal');
    });

    it('reports multicast for first octet with LSB set (0x01)', async () => {
      const boxes = await MacAddressBoxSource.generateBoxes(
        '01:00:5e:00:00:01',
        { mac: true },
      );
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Type).toMatch(/^multicast/);
    });

    it('reports local for first octet with 2nd-LSB set (0x02)', async () => {
      const boxes = await MacAddressBoxSource.generateBoxes(
        '02:00:00:00:00:01',
        { mac: true },
      );
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Type).toMatch(/local$/);
    });
  });

  describe('invalid input', () => {
    it('returns [] for non-hex string', async () => {
      const boxes = await MacAddressBoxSource.generateBoxes('xyz', {
        mac: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for wrong length', async () => {
      const boxes = await MacAddressBoxSource.generateBoxes('001b44', {
        mac: true,
      });
      expect(boxes).toHaveLength(0);
    });

    it('returns [] for empty input', async () => {
      const boxes = await MacAddressBoxSource.generateBoxes('', { mac: true });
      expect(boxes).toHaveLength(0);
    });
  });

  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(MacAddressBoxSource.name).toBe('MAC Address');
      expect(MacAddressBoxSource.tag).toBe('#');
      expect(MacAddressBoxSource.kind).toBe('Convert');
      expect(typeof MacAddressBoxSource.priority).toBe('number');
    });
  });
});
