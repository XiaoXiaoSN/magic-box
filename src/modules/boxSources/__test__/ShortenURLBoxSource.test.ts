import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ShortenURLBoxSource } from '../ShortenURLBoxSource';

describe('ShortenURLBoxSource', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });

  it('only matches valid HTTP(S) input and never fetches while generating', async () => {
    expect(
      await ShortenURLBoxSource.checkMatch('not a URL', { surl: true }),
    ).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();

    const boxes = await ShortenURLBoxSource.generateBoxes(
      'https://example.com',
      { surl: true },
      { preview: false, signal: new AbortController().signal },
    );

    expect(boxes).toHaveLength(1);
    expect(boxes[0].view).toBe('shortenURL');
    expect(boxes[0].props.sourceInput).toBe('https://example.com');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps preview generation inert', async () => {
    const boxes = await ShortenURLBoxSource.generateBoxes(
      'https://example.com',
      { surl: true },
      { preview: true, signal: new AbortController().signal },
    );

    expect(boxes).toHaveLength(1);
    expect(boxes[0].props.options).toMatchObject({ preview: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses an explicit JSON POST and returns the public short URL', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ shorten: 'abc' }),
    });

    await expect(
      ShortenURLBoxSource.getShortenURL('https://example.com', null),
    ).resolves.toBe('https://10oz.tw/abc');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/surl'),
      expect.objectContaining({
        body: JSON.stringify({ url: 'https://example.com', shorten: null }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('rejects invalid responses and can retry after a failed request', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ error: 'busy' }),
    });
    await expect(
      ShortenURLBoxSource.getShortenURL('https://example.com', null),
    ).rejects.toThrow('response was invalid');

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ shorten: 'retry' }),
    });
    await expect(
      ShortenURLBoxSource.getShortenURL('https://example.com', null),
    ).resolves.toBe('https://10oz.tw/retry');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not issue a request for invalid action input', async () => {
    await expect(
      ShortenURLBoxSource.getShortenURL('example.com', null),
    ).rejects.toThrow('valid HTTP(S) URL');
    expect((fetchMock as Mock).mock.calls).toHaveLength(0);
  });
});
