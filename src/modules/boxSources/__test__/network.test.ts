import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchWithTimeout } from '../network';

describe('fetchWithTimeout', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    vi.useFakeTimers();
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('aborts a hanging request at the timeout and allows a later retry', async () => {
    fetchMock.mockImplementationOnce(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise((_, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(init.signal?.reason),
          );
        }),
    );

    const firstRequest = fetchWithTimeout('https://example.com', {}, 10);
    const firstFailure = expect(firstRequest).rejects.toMatchObject({
      name: 'TimeoutError',
    });
    await vi.advanceTimersByTimeAsync(10);
    await firstFailure;

    fetchMock.mockResolvedValueOnce({ ok: true, status: 200 });
    await expect(
      fetchWithTimeout('https://example.com', {}, 10),
    ).resolves.toMatchObject({ ok: true, status: 200 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
