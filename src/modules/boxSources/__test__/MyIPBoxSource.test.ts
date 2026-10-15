import type { Mock } from 'vitest';
import { expect, vi } from 'vitest';
import { clearMyIPCache, MyIPBoxSource } from '../MyIPBoxSource';

// Mock fetch
global.fetch = vi.fn();

describe('MyIPBoxSource', () => {
  const mockIPInfo = {
    city: 'Auckland',
    country: 'NZ',
    ip: '116.12.57.176',
    loc: '-36.8485,174.7635',
    org: 'AS58610 Telnet Telecommunication Limited',
    postal: '1010',
    readme: 'https://ipinfo.io/missingauth',
    region: 'Auckland',
    timezone: 'Pacific/Auckland',
  };

  beforeEach(() => {
    (global.fetch as Mock).mockReset();
    clearMyIPCache();
  });

  describe('checkMatch', () => {
    it('should return undefined for empty input', async () => {
      expect(await MyIPBoxSource.checkMatch('')).toBeUndefined();
    });

    it('should return undefined for invalid input', async () => {
      expect(await MyIPBoxSource.checkMatch('invalid')).toBeUndefined();
      expect(await MyIPBoxSource.checkMatch('my-ip')).toBeUndefined();
    });

    it('should return IP info when API call is successful', async () => {
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => Promise.resolve(mockIPInfo),
      });

      const result = await MyIPBoxSource.checkMatch('ip');
      expect(result).toBeDefined();
      expect(result?.ip).toBe('116.12.57.176');
      expect(result?.location).toBe('NZ');
      expect(result?.colocation).toBe('Auckland');
    });

    it('should return undefined when API call fails', async () => {
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => Promise.resolve({ error: 'rate limited' }),
      });

      const result = await MyIPBoxSource.checkMatch('ip');
      expect(result).toBeUndefined();
    });

    it('should work with both "ip" and "myip" inputs', async () => {
      (global.fetch as Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => Promise.resolve(mockIPInfo),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => Promise.resolve(mockIPInfo),
        });

      const result1 = await MyIPBoxSource.checkMatch('ip');
      const result2 = await MyIPBoxSource.checkMatch('myip');

      expect(result1).toEqual(result2);
      expect(result1?.ip).toBe('116.12.57.176');
      expect(global.fetch).toHaveBeenCalledOnce();
    });
  });

  describe('generateBoxes', () => {
    it('should return empty array for invalid input', async () => {
      const boxes = await MyIPBoxSource.generateBoxes('invalid');
      expect(boxes).toHaveLength(0);
    });

    it('should generate box with correct display text', async () => {
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => Promise.resolve(mockIPInfo),
      });

      const boxes = await MyIPBoxSource.generateBoxes('ip');
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('My IP');
      expect(boxes[0].props.plaintextOutput).toBe(
        '116.12.57.176 (Auckland, NZ)',
      );
      expect(boxes[0].props.priority).toBe(10);
      expect(boxes[0].view).toBe('default');
    });

    it('rejects malformed successful responses', async () => {
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => Promise.resolve({ ip: 123 }),
      });

      await expect(MyIPBoxSource.generateBoxes('ip')).resolves.toHaveLength(0);
    });

    it('keeps preview generation network-free', async () => {
      const boxes = await MyIPBoxSource.generateBoxes('ip', null, {
        preview: true,
        signal: new AbortController().signal,
      });

      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toContain(
        'Network lookup is disabled',
      );
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('shares in-flight work without letting one cancelled caller poison another', async () => {
      let resolveFetch!: (value: unknown) => void;
      (global.fetch as Mock).mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
      );
      const cancelled = new AbortController();
      const survivor = new AbortController();

      const cancelledResult = MyIPBoxSource.checkMatch('ip', cancelled.signal);
      const survivorResult = MyIPBoxSource.checkMatch('myip', survivor.signal);
      cancelled.abort();
      resolveFetch({
        ok: true,
        status: 200,
        json: async () => mockIPInfo,
      });

      await expect(cancelledResult).resolves.toBeUndefined();
      await expect(survivorResult).resolves.toMatchObject({
        ip: '116.12.57.176',
      });
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('does not cache a failed request so a later call can retry', async () => {
      (global.fetch as Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          json: async () => ({ error: 'unavailable' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockIPInfo,
        });

      await expect(MyIPBoxSource.checkMatch('ip')).resolves.toBeUndefined();
      await expect(MyIPBoxSource.checkMatch('ip')).resolves.toMatchObject({
        ip: '116.12.57.176',
      });
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
});
