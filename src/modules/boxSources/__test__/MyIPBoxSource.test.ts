import { expect, vi } from 'vitest';

import { DefaultBoxTemplate } from '@components/BoxTemplate';

import { MyIPBoxSource } from '../MyIPBoxSource';

import type { Mock} from 'vitest';


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
    vi.clearAllMocks();
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
        json: async () => Promise.resolve(mockIPInfo),
      });

      const result = await MyIPBoxSource.checkMatch('ip');
      expect(result).toBeDefined();
      expect(result?.ip).toBe('116.12.57.176');
      expect(result?.location).toBe('NZ');
      expect(result?.colocation).toBe('Auckland');
    });

    it('should return undefined when API call fails', async () => {
      (global.fetch as Mock).mockRejectedValueOnce(new Error('API Error'));

      const result = await MyIPBoxSource.checkMatch('ip');
      expect(result).toBeUndefined();
    });

    it('should work with both "ip" and "myip" inputs', async () => {
      (global.fetch as Mock)
        .mockResolvedValueOnce({
          json: async () => Promise.resolve(mockIPInfo),
        })
        .mockResolvedValueOnce({
          json: async () => Promise.resolve(mockIPInfo),
        });

      const result1 = await MyIPBoxSource.checkMatch('ip');
      const result2 = await MyIPBoxSource.checkMatch('myip');

      expect(result1).toEqual(result2);
      expect(result1?.ip).toBe('116.12.57.176');
    });
  });

  describe('generateBoxes', () => {
    it('should return empty array for invalid input', async () => {
      const boxes = await MyIPBoxSource.generateBoxes('invalid');
      expect(boxes).toHaveLength(0);
    });

    it('should generate box with correct display text', async () => {
      (global.fetch as Mock).mockResolvedValueOnce({
        json: async () => Promise.resolve(mockIPInfo),
      });

      const boxes = await MyIPBoxSource.generateBoxes('ip');
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('My IP');
      expect(boxes[0].props.plaintextOutput).toBe('116.12.57.176 (Auckland, NZ)');
      expect(boxes[0].props.priority).toBe(10);
      expect(boxes[0].component).toBe(DefaultBoxTemplate);
    });
  });
});
