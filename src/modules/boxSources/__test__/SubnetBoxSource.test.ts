import { describe, expect, it } from 'vitest';

import { SubnetBoxSource } from '../SubnetBoxSource';

describe('SubnetBoxSource', () => {
  describe('generateBoxes - no option', () => {
    it('returns empty array when no subnet/cidr option is provided', async () => {
      const boxes = await SubnetBoxSource.generateBoxes(
        '192.168.1.10/24',
        null,
      );
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty options', async () => {
      const boxes = await SubnetBoxSource.generateBoxes('192.168.1.10/24', {});
      expect(boxes).toHaveLength(0);
    });
  });

  describe('generateBoxes - /24 canonical case', () => {
    it('computes correct subnet info for 192.168.1.10/24', async () => {
      const boxes = await SubnetBoxSource.generateBoxes('192.168.1.10/24', {
        subnet: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.CIDR).toBe('192.168.1.0/24');
      expect(opts.Netmask).toBe('255.255.255.0');
      expect(opts.Wildcard).toBe('0.0.0.255');
      expect(opts.Network).toBe('192.168.1.0');
      expect(opts.Broadcast).toBe('192.168.1.255');
      expect(opts['First Host']).toBe('192.168.1.1');
      expect(opts['Last Host']).toBe('192.168.1.254');
      expect(opts['Total Addresses']).toBe('256');
      expect(opts['Usable Hosts']).toBe('254');
    });

    it('also triggers on ::cidr option key', async () => {
      const boxes = await SubnetBoxSource.generateBoxes('192.168.1.10/24', {
        cidr: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Netmask).toBe('255.255.255.0');
    });
  });

  describe('generateBoxes - /8 class A', () => {
    it('computes correct subnet info for 10.0.0.0/8', async () => {
      const boxes = await SubnetBoxSource.generateBoxes('10.0.0.0/8', {
        subnet: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Netmask).toBe('255.0.0.0');
      expect(opts.Broadcast).toBe('10.255.255.255');
      expect(opts['Total Addresses']).toBe('16777216');
      expect(opts['Usable Hosts']).toBe('16777214');
    });
  });

  describe('generateBoxes - /32 host route', () => {
    it('reports 1 total address and 1 usable host for /32', async () => {
      const boxes = await SubnetBoxSource.generateBoxes('1.2.3.4/32', {
        subnet: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Total Addresses']).toBe('1');
      expect(opts['Usable Hosts']).toBe('1');
      expect(opts.Network).toBe('1.2.3.4');
      expect(opts.Broadcast).toBe('1.2.3.4');
    });
  });

  describe('generateBoxes - /31 point-to-point (RFC 3021)', () => {
    it('reports 2 usable hosts for /31', async () => {
      const boxes = await SubnetBoxSource.generateBoxes('1.2.3.4/31', {
        subnet: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Total Addresses']).toBe('2');
      expect(opts['Usable Hosts']).toBe('2');
    });
  });

  describe('generateBoxes - /0 default route', () => {
    it('computes correct values for 0.0.0.0/0', async () => {
      const boxes = await SubnetBoxSource.generateBoxes('0.0.0.0/0', {
        subnet: true,
      });
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Netmask).toBe('0.0.0.0');
      expect(opts.Network).toBe('0.0.0.0');
      expect(opts.Broadcast).toBe('255.255.255.255');
    });
  });

  describe('generateBoxes - invalid inputs return error box', () => {
    it('returns an error box for invalid octet 999.1.1.1/24', async () => {
      const boxes = await SubnetBoxSource.generateBoxes('999.1.1.1/24', {
        subnet: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/invalid/i);
    });

    it('returns an error box for non-CIDR string "abc"', async () => {
      const boxes = await SubnetBoxSource.generateBoxes('abc', {
        subnet: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/invalid/i);
    });

    it('returns an error box for missing prefix "192.168.1.1"', async () => {
      const boxes = await SubnetBoxSource.generateBoxes('192.168.1.1', {
        subnet: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/invalid/i);
    });

    it('returns an error box for prefix out of range /33', async () => {
      const boxes = await SubnetBoxSource.generateBoxes('192.168.1.1/33', {
        subnet: true,
      });
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toMatch(/invalid/i);
    });
  });

  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(SubnetBoxSource.name).toBe('Subnet');
      expect(SubnetBoxSource.tag).toBe('#');
      expect(SubnetBoxSource.kind).toBe('Analyze');
      expect(typeof SubnetBoxSource.priority).toBe('number');
    });
  });
});
