import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchJsonWithTimeout, fetchWithTimeout } from '../network';

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

  it('keeps the timeout active while a response body is stalled', async () => {
    fetchMock.mockImplementationOnce(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            new Promise((_, reject) => {
              init?.signal?.addEventListener('abort', () =>
                reject(init.signal?.reason),
              );
            }),
        }),
    );

    const firstRequest = fetchJsonWithTimeout('https://example.com', {}, 10);
    const firstFailure = expect(firstRequest).rejects.toMatchObject({
      name: 'TimeoutError',
    });
    await vi.advanceTimersByTimeAsync(10);
    await firstFailure;

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });
    await expect(
      fetchJsonWithTimeout('https://example.com', {}, 10),
    ).resolves.toMatchObject({
      payload: { ok: true },
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('forwards caller cancellation while a response body is stalled', async () => {
    fetchMock.mockImplementationOnce(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            new Promise((_, reject) => {
              init?.signal?.addEventListener('abort', () =>
                reject(init.signal?.reason),
              );
            }),
        }),
    );
    const caller = new AbortController();
    const request = fetchJsonWithTimeout(
      'https://example.com',
      { signal: caller.signal },
      10,
    );
    await Promise.resolve();
    await Promise.resolve();
    const failure = expect(request).rejects.toMatchObject({
      name: 'AbortError',
    });
    caller.abort();
    await failure;
  });
});
