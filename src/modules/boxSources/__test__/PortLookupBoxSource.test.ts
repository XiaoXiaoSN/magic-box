import { describe, expect, it } from 'vitest';

import { PortLookupBoxSource } from '../PortLookupBoxSource';

describe('PortLookupBoxSource', () => {
  describe('option gating', () => {
    it('returns empty array when no option is provided', async () => {
      const boxes = await PortLookupBoxSource.generateBoxes('443', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns empty array for empty options object', async () => {
      const boxes = await PortLookupBoxSource.generateBoxes('443', {});
      expect(boxes).toHaveLength(0);
    });
  });

  describe('number → service lookup', () => {
    it('443 resolves to HTTPS with TLS in description and well-known range', async () => {
      const boxes = await PortLookupBoxSource.generateBoxes('443', {
        port: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Service).toBe('HTTPS');
      expect(opts.Description).toMatch(/TLS/i);
      expect(opts.Range).toBe('well-known');
      expect(opts.Port).toBe('443');
    });

    it('80 resolves to HTTP', async () => {
      const boxes = await PortLookupBoxSource.generateBoxes('80', {
        port: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Service).toBe('HTTP');
      expect(opts.Range).toBe('well-known');
    });

    it('22 resolves to SSH', async () => {
      const boxes = await PortLookupBoxSource.generateBoxes('22', {
        port: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Service).toBe('SSH');
    });

    it('::portlookup alias also triggers lookup', async () => {
      const boxes = await PortLookupBoxSource.generateBoxes('22', {
        portlookup: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Service).toBe('SSH');
    });

    it('valid but unknown port 12345 uses the built-in table label', async () => {
      const boxes = await PortLookupBoxSource.generateBoxes('12345', {
        port: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Service).toBe('not in built-in table');
      expect(opts.Range).toBe('registered');
    });

    it.each([
      ['69', 'TFTP'],
      ['88', 'Kerberos'],
      ['179', 'BGP'],
      ['514', 'Syslog'],
      ['2049', 'NFS'],
      ['2379', 'etcd'],
      ['5900', 'VNC'],
      ['6443', 'Kubernetes API'],
      ['9092', 'Kafka'],
      ['11211', 'Memcached'],
    ])('looks up port %s as %s', async (port, service) => {
      const boxes = await PortLookupBoxSource.generateBoxes(port, {
        port: true,
      });
      expect(boxes[0].props.options?.Service).toBe(service);
    });

    it('accepts an optional TCP or UDP suffix', async () => {
      const boxes = await PortLookupBoxSource.generateBoxes('443/tcp', {
        port: true,
      });
      expect(boxes[0].props.options).toMatchObject({
        Service: 'HTTPS',
        Protocol: 'TCP',
      });
    });

    it('out-of-range port 70000 returns an invalid box', async () => {
      const boxes = await PortLookupBoxSource.generateBoxes('70000', {
        port: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Service).toMatch(/invalid|out of range/i);
    });

    it('dynamic/private range port 50000 shows correct range', async () => {
      const boxes = await PortLookupBoxSource.generateBoxes('50000', {
        port: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts.Range).toBe('dynamic/private');
    });
  });

  describe('name → port(s) lookup', () => {
    it('"https" resolves to port 443', async () => {
      const boxes = await PortLookupBoxSource.generateBoxes('https', {
        port: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Port(s)']).toContain('443');
    });

    it('"http" resolves to port 80', async () => {
      const boxes = await PortLookupBoxSource.generateBoxes('http', {
        port: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Port(s)']).toContain('80');
    });

    it('"HTTPS" is case-insensitive and resolves to 443', async () => {
      const boxes = await PortLookupBoxSource.generateBoxes('HTTPS', {
        port: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Port(s)']).toContain('443');
    });

    it('"hello!" returns a no-match box', async () => {
      const boxes = await PortLookupBoxSource.generateBoxes('hello!', {
        port: true,
      });
      expect(boxes).toHaveLength(1);
      const opts = boxes[0].props.options as Record<string, string>;
      expect(opts['Port(s)']).toMatch(/no match/i);
    });
  });

  describe('box structure', () => {
    it('box is named "Port Lookup"', async () => {
      const boxes = await PortLookupBoxSource.generateBoxes('443', {
        port: true,
      });
      expect(boxes[0].props.name).toBe('Port Lookup');
    });

    it('plaintextOutput contains key:value pairs', async () => {
      const boxes = await PortLookupBoxSource.generateBoxes('443', {
        port: true,
      });
      expect(boxes[0].props.plaintextOutput).toContain('Service: HTTPS');
    });

    it('boxTemplate is set (KeyValueBoxTemplate)', async () => {
      const boxes = await PortLookupBoxSource.generateBoxes('443', {
        port: true,
      });
      expect(boxes[0].view).toBeDefined();
    });
  });

  describe('metadata', () => {
    it('has expected static properties', () => {
      expect(PortLookupBoxSource.name).toBe('Port Lookup');
      expect(PortLookupBoxSource.tag).toBe('#');
      expect(PortLookupBoxSource.kind).toBe('Decode');
    });
  });
});
