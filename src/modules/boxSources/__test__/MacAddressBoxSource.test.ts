import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { MacAddressBoxSource } from '../MacAddressBoxSource';

describe('MacAddressBoxSource', () => {
  describe('option gating', () => {
    it('returns empty array when no option is provided', async () => {
      const boxes = await MacAddressBoxSource.generateBoxes(
        '01:23:45:67:89:ab',
        null,
      );
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array when mac option is absent', async () => {
      const boxes = await MacAddressBoxSource.generateBoxes(
        '01:23:45:67:89:ab',
        { other: true },
      );
      expect(boxes).toHaveLength(0);
    });

    it('triggers on ::macaddress option', async () => {
      const boxes = await MacAddressBoxSource.generateBoxes(
        '01:23:45:67:89:ab',
        { macaddress: true },
      );
      expect(boxes).toHaveLength(1);
    });
  });

  describe('colon-separated input', () => {
    it('normalizes colon format and extracts all fields', async () => {
      const boxes = await MacAddressBoxSource.generateBoxes(
        '01:23:45:67:89:ab',
        { mac: true },
      );
      expect(boxes).toHaveLength(1);

      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Colon).toBe('01:23:45:67:89:ab');
      expect(opts.Hyphen).toBe('01-23-45-67-89-ab');
      expect(opts.Dot).toBe('0123.4567.89ab');
      expect(opts.Bare).toBe('0123456789ab');
      expect(opts.OUI).toBe('01:23:45');
      expect(opts.NIC).toBe('67:89:ab');
    });

    it('uses KeyValueBoxTemplate', async () => {
      const boxes = await MacAddressBoxSource.generateBoxes(
        '01:23:45:67:89:ab',
        { mac: true },
      );
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
    });

    it('plaintext output contains key: value lines', async () => {
      const boxes = await MacAddressBoxSource.generateBoxes(
        '01:23:45:67:89:ab',
        { mac: true },
      );
      const text = boxes[0].props.plaintextOutput ?? '';
      expect(text).toContain('Colon: 01:23:45:67:89:ab');
      expect(text).toContain('OUI: 01:23:45');
    });
  });

  describe('format normalization', () => {
    it('normalizes hyphen format (mixed case) to lowercase colon', async () => {
      const boxes = await MacAddressBoxSource.generateBoxes(
        '01-23-45-67-89-AB',
        { mac: true },
      );
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Colon).toBe('01:23:45:67:89:ab');
      expect(opts.Hyphen).toBe('01-23-45-67-89-ab');
    });

    it('normalizes Cisco dot notation to colon', async () => {
      const boxes = await MacAddressBoxSource.generateBoxes('0123.4567.89ab', {
        mac: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Colon).toBe('01:23:45:67:89:ab');
    });

    it('normalizes bare 12-digit hex to colon', async () => {
      const boxes = await MacAddressBoxSource.generateBoxes('0123456789ab', {
        mac: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Colon).toBe('01:23:45:67:89:ab');
    });

    it('accepts uppercase in colon format and lowercases output', async () => {
      const boxes = await MacAddressBoxSource.generateBoxes(
        'AA:BB:CC:DD:EE:FF',
        { mac: true },
      );
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Colon).toBe('aa:bb:cc:dd:ee:ff');
      expect(opts.Bare).toBe('aabbccddeeff');
    });
  });

  describe('type flag bits', () => {
    it('first byte 0x01 → multicast, globally unique', async () => {
      const boxes = await MacAddressBoxSource.generateBoxes(
        '01:00:00:00:00:00',
        { mac: true },
      );
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Type).toContain('multicast');
      expect(opts.Type).toContain('globally unique');
    });

    it('first byte 0x02 → unicast, locally administered', async () => {
      const boxes = await MacAddressBoxSource.generateBoxes(
        '02:00:00:00:00:00',
        { mac: true },
      );
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Type).toContain('unicast');
      expect(opts.Type).toContain('locally administered');
    });

    it('first byte 0x03 → multicast, locally administered', async () => {
      const boxes = await MacAddressBoxSource.generateBoxes(
        '03:00:00:00:00:00',
        { mac: true },
      );
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Type).toContain('multicast');
      expect(opts.Type).toContain('locally administered');
    });

    it('first byte 0x00 → unicast, globally unique', async () => {
      const boxes = await MacAddressBoxSource.generateBoxes(
        '00:00:00:00:00:00',
        { mac: true },
      );
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Type).toContain('unicast');
      expect(opts.Type).toContain('globally unique');
    });
  });

  describe('EUI-64 expansion', () => {
    it('inserts ff:fe after OUI and flips U/L bit', async () => {
      // 00:23:45 → flip U/L (0x02) on first byte → 02:23:45, then insert ff:fe → 02:23:45:ff:fe:67:89:ab
      const boxes = await MacAddressBoxSource.generateBoxes(
        '00:23:45:67:89:ab',
        { mac: true },
      );
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['EUI-64']).toBe('02:23:45:ff:fe:67:89:ab');
    });

    it('EUI-64 for 01:23:45:67:89:ab flips bit 1 of first byte', async () => {
      // first byte 0x01 ^ 0x02 = 0x03
      const boxes = await MacAddressBoxSource.generateBoxes(
        '01:23:45:67:89:ab',
        { mac: true },
      );
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['EUI-64']).toBe('03:23:45:ff:fe:67:89:ab');
    });
  });

  describe('invalid input', () => {
    it('returns an error box for "hello"', async () => {
      const boxes = await MacAddressBoxSource.generateBoxes('hello', {
        mac: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Error).toMatch(/valid MAC address/i);
    });

    it('returns an error box for too-short input "01:23:45"', async () => {
      const boxes = await MacAddressBoxSource.generateBoxes('01:23:45', {
        mac: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Error).toMatch(/valid MAC address/i);
    });

    it('returns an error box for empty string', async () => {
      const boxes = await MacAddressBoxSource.generateBoxes('', { mac: true });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Error).toMatch(/valid MAC address/i);
    });

    it('error box plaintext is not empty', async () => {
      const boxes = await MacAddressBoxSource.generateBoxes('not-a-mac', {
        mac: true,
      });
      expect(boxes[0].props.plaintextOutput).toBeTruthy();
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
