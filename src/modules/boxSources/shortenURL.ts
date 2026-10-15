import { getShortenUrl, getToolboxUrl } from '@functions/runtimePrefs';

import { fetchWithTimeout } from './network';

export const isHttpUrl = (input: string): boolean => {
  try {
    const url = new URL(input.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

interface ShortenResponse {
  shorten: string;
}

const isShortenResponse = (value: unknown): value is ShortenResponse =>
  typeof value === 'object' &&
  value !== null &&
  'shorten' in value &&
  typeof value.shorten === 'string' &&
  value.shorten.trim() !== '';

/** sends one explicit shorten action and returns the public short-link URL. */
export async function requestShortenURL(
  inputURL: string,
  shorten: string | null,
  signal?: AbortSignal,
): Promise<string> {
  const url = inputURL.trim();
  if (!isHttpUrl(url)) {
    throw new Error('Enter a valid HTTP(S) URL.');
  }

  const response = await fetchWithTimeout(`${getToolboxUrl()}/api/v1/surl`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, shorten }),
    signal,
  });
  if (
    response.ok === false ||
    (response.status !== undefined &&
      (response.status < 200 || response.status >= 300))
  ) {
    throw new Error('The Shorten URL request failed.');
  }

  const result: unknown = await response.json();
  if (!isShortenResponse(result)) {
    throw new Error('The Shorten URL response was invalid.');
  }

  return `${getShortenUrl().replace(/\/$/, '')}/${result.shorten.trim()}`;
}
