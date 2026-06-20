import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { CidrBoxSource } from '@modules/boxSources/CidrBoxSource';
import { describe, expect, it } from 'vitest';

describe('CidrBoxSource', () => {
  describe('generateBoxes — non-matching input', () => {
    it('returns [] for plain text', async () => {
      expect(await CidrBoxSource.generateBoxes('hello')).toHaveLength(0);
    });

    it('returns [] for bare IP without prefix', async () => {
      expect(await CidrBoxSource.generateBoxes('1.2.3.4')).toHaveLength(0);
    });

    it('returns [] for octet out of range', async () => {
      expect(await CidrBoxSource.generateBoxes('999.1.1.1/24')).toHaveLength(0);
    });

    it('returns [] for prefix > 32', async () => {
      expect(await CidrBoxSource.generateBoxes('10.0.0.0/33')).toHaveLength(0);
    });
  });

  describe('generateBoxes — /24 network', () => {
    it('returns one box with correct subnet values', async () => {
      const boxes = await CidrBoxSource.generateBoxes('192.168.1.0/24');
      expect(boxes).toHaveLength(1);

      const { options } = boxes[0].props;
      expect(options).toMatchObject({
        Network: '192.168.1.0',
        Broadcast: '192.168.1.255',
        Netmask: '255.255.255.0',
        Wildcard: '0.0.0.255',
        'First Host': '192.168.1.1',
        'Last Host': '192.168.1.254',
        'Total Addresses': '256',
        'Usable Hosts': '254',
      });
    });

    it('uses KeyValueBoxTemplate', async () => {
      const boxes = await CidrBoxSource.generateBoxes('192.168.1.0/24');
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
    });

    it('applies configured priority', async () => {
      const boxes = await CidrBoxSource.generateBoxes('192.168.1.0/24');
      expect(boxes[0].props.priority).toBe(20);
    });
  });

  describe('generateBoxes — /8 network', () => {
    it('computes correct netmask and total addresses', async () => {
      const boxes = await CidrBoxSource.generateBoxes('10.0.0.0/8');
      expect(boxes).toHaveLength(1);

      const { options } = boxes[0].props;
      expect(options?.Netmask).toBe('255.0.0.0');
      expect(options?.['Total Addresses']).toBe('16777216');
    });
  });

  describe('generateBoxes — /32 host route', () => {
    it('reports usable 1 with first == last == the address itself', async () => {
      const boxes = await CidrBoxSource.generateBoxes('192.168.1.5/32');
      expect(boxes).toHaveLength(1);

      const { options } = boxes[0].props;
      expect(options?.['Usable Hosts']).toBe('1');
      expect(options?.['First Host']).toBe('192.168.1.5');
      expect(options?.['Last Host']).toBe('192.168.1.5');
    });
  });

  describe('generateBoxes — /31 point-to-point', () => {
    it('reports usable 2', async () => {
      const boxes = await CidrBoxSource.generateBoxes('10.0.0.0/31');
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options?.['Usable Hosts']).toBe('2');
    });
  });

  describe('generateBoxes — whitespace tolerance', () => {
    it('trims surrounding whitespace before parsing', async () => {
      const boxes = await CidrBoxSource.generateBoxes('  192.168.1.0/24  ');
      expect(boxes).toHaveLength(1);
    });
  });

  describe('generateBoxes — /0 default route', () => {
    it('computes the all-internet subnet (guards the 32-bit shift edge case)', async () => {
      const boxes = await CidrBoxSource.generateBoxes('0.0.0.0/0');
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Netmask).toBe('0.0.0.0');
      expect(opts.Wildcard).toBe('255.255.255.255');
      expect(opts['Total Addresses']).toBe('4294967296');
    });
  });
});
