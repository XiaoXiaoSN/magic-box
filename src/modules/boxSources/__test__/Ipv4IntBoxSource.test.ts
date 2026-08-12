import { describe, expect, it } from 'vitest';

import { Ipv4IntBoxSource } from '../Ipv4IntBoxSource';

describe('Ipv4IntBoxSource', () => {
  describe('option gating', () => {
    it('returns empty array when no option is provided', async () => {
      const boxes = await Ipv4IntBoxSource.generateBoxes('192.168.1.1', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty options object', async () => {
      const boxes = await Ipv4IntBoxSource.generateBoxes('192.168.1.1', {});
      expect(boxes).toHaveLength(0);
    });
  });

  describe('IPv4 → integer (::iptoint)', () => {
    it('converts 192.168.1.1 to correct integer and hex', async () => {
      // 192*16777216 + 168*65536 + 1*256 + 1 = 3232235777 = 0xC0A80101
      const boxes = await Ipv4IntBoxSource.generateBoxes('192.168.1.1', {
        iptoint: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.IPv4).toBe('192.168.1.1');
      expect(opts.Integer).toBe('3232235777');
      expect(opts.Hex).toBe('0xc0a80101');
    });

    it('converts 0.0.0.0 to integer 0 and hex 0x00000000', async () => {
      const boxes = await Ipv4IntBoxSource.generateBoxes('0.0.0.0', {
        iptoint: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Integer).toBe('0');
      expect(opts.Hex).toBe('0x00000000');
    });

    it('converts 255.255.255.255 to integer 4294967295 and hex 0xffffffff', async () => {
      const boxes = await Ipv4IntBoxSource.generateBoxes('255.255.255.255', {
        iptoint: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Integer).toBe('4294967295');
      expect(opts.Hex).toBe('0xffffffff');
    });
  });

  describe('IPv4 → integer (::ipint alias)', () => {
    it('accepts ::ipint as an alias for ::iptoint', async () => {
      const boxes = await Ipv4IntBoxSource.generateBoxes('10.0.0.1', {
        ipint: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.IPv4).toBe('10.0.0.1');
      // 10*16777216 + 0 + 0 + 1 = 167772161
      expect(opts.Integer).toBe('167772161');
    });
  });

  describe('integer → IPv4 (reverse direction)', () => {
    it('converts 3232235777 back to 192.168.1.1', async () => {
      const boxes = await Ipv4IntBoxSource.generateBoxes('3232235777', {
        iptoint: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.IPv4).toBe('192.168.1.1');
      expect(opts.Integer).toBe('3232235777');
      expect(opts.Hex).toBe('0xc0a80101');
    });

    it('converts 4294967295 to 255.255.255.255', async () => {
      const boxes = await Ipv4IntBoxSource.generateBoxes('4294967295', {
        iptoint: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.IPv4).toBe('255.255.255.255');
      expect(opts.Hex).toBe('0xffffffff');
    });

    it('converts 0 to 0.0.0.0', async () => {
      const boxes = await Ipv4IntBoxSource.generateBoxes('0', {
        iptoint: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.IPv4).toBe('0.0.0.0');
    });
  });

  describe('round-trip', () => {
    it('192.168.1.1 → integer → IPv4 is lossless', async () => {
      const fwd = await Ipv4IntBoxSource.generateBoxes('192.168.1.1', {
        iptoint: true,
      });
      const intStr = (fwd[0].props.options as Record<string, string>).Integer;

      const rev = await Ipv4IntBoxSource.generateBoxes(intStr, {
        iptoint: true,
      });
      const ip = (rev[0].props.options as Record<string, string>).IPv4;
      expect(ip).toBe('192.168.1.1');
    });
  });

  describe('invalid inputs → help box', () => {
    it('rejects octet value 256 (256.1.1.1)', async () => {
      const boxes = await Ipv4IntBoxSource.generateBoxes('256.1.1.1', {
        iptoint: true,
      });
      expect(boxes).toHaveLength(1);
      // help box has Format key, not Integer
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Integer).toBeUndefined();
      expect(opts.Format).toBeDefined();
    });

    it('rejects integer 4294967296 (out of 32-bit range)', async () => {
      const boxes = await Ipv4IntBoxSource.generateBoxes('4294967296', {
        iptoint: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.IPv4).toBeUndefined();
      expect(opts.Format).toBeDefined();
    });

    it('rejects arbitrary text like "hello"', async () => {
      const boxes = await Ipv4IntBoxSource.generateBoxes('hello', {
        iptoint: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Format).toBeDefined();
    });
  });

  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(Ipv4IntBoxSource.name).toBe('IPv4 ↔ Integer');
      expect(Ipv4IntBoxSource.tag).toBe('#');
      expect(Ipv4IntBoxSource.kind).toBe('Convert');
      expect(typeof Ipv4IntBoxSource.priority).toBe('number');
    });
  });
});
