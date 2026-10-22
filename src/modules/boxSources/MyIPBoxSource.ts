import { isString, trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder } from '@modules/Box';
import type { BoxSourceContext } from '@modules/BoxSource';

import { fetchJsonWithTimeout, withAbort } from './network';

interface IPInfoResponse {
  city?: string;
  country?: string;
  ip: string;
}

interface Match {
  ip: string;
  location?: string;
  colocation?: string;
}

interface CacheEntry {
  key: string;
  expiresAt: number;
  promise: Promise<Match>;
}

const CACHE_TTL_MS = 15_000;
let cacheEntry: CacheEntry | null = null;

const isIPInfoResponse = (value: unknown): value is IPInfoResponse =>
  typeof value === 'object' &&
  value !== null &&
  'ip' in value &&
  typeof value.ip === 'string' &&
  value.ip.trim() !== '' &&
  (!('country' in value) ||
    typeof value.country === 'string' ||
    value.country === undefined) &&
  (!('city' in value) ||
    typeof value.city === 'string' ||
    value.city === undefined);

const getIPInfoURL = (): string => 'https://ipinfo.io/json';

const fetchIPInfo = async (
  url: string,
  signal: AbortSignal,
): Promise<Match> => {
  const { response, payload } = await fetchJsonWithTimeout<unknown>(url, {
    signal,
  });
  if (
    response.ok === false ||
    (response.status !== undefined &&
      (response.status < 200 || response.status >= 300))
  ) {
    throw new Error('The My IP request failed.');
  }

  if (!isIPInfoResponse(payload)) {
    throw new Error('The My IP response was invalid.');
  }

  return {
    ip: payload.ip.trim(),
    location: payload.country,
    colocation: payload.city,
  };
};

const getCachedMatch = (url: string, signal?: AbortSignal): Promise<Match> => {
  const now = Date.now();
  if (
    cacheEntry &&
    cacheEntry.key === url &&
    (cacheEntry.expiresAt === Number.POSITIVE_INFINITY ||
      cacheEntry.expiresAt > now)
  ) {
    return withAbort(cacheEntry.promise, signal);
  }

  const controller = new AbortController();
  const nextEntry: CacheEntry = {
    key: url,
    expiresAt: Number.POSITIVE_INFINITY,
    promise: fetchIPInfo(url, controller.signal),
  };
  cacheEntry = nextEntry;
  void nextEntry.promise.then(
    () => {
      nextEntry.expiresAt = Date.now() + CACHE_TTL_MS;
    },
    () => {
      if (cacheEntry === nextEntry) cacheEntry = null;
    },
  );
  return withAbort(nextEntry.promise, signal);
};

export const clearMyIPCache = (): void => {
  cacheEntry = null;
};

export const MyIPBoxSource = {
  name: 'My IP',
  description: 'Show your public IP address along with geolocation.',
  defaultInput: 'ip',
  tag: '◉',
  kind: 'Info',

  async checkMatch(
    input: string,
    signal?: AbortSignal,
  ): Promise<Match | undefined> {
    if (!isString(input)) {
      return undefined;
    }
    const regularInput = trim(input).toLowerCase();

    if (!['ip', 'myip'].includes(regularInput)) {
      return undefined;
    }

    try {
      return await getCachedMatch(getIPInfoURL(), signal);
    } catch {
      /* */
    }

    return undefined;
  },

  async generateBoxes(
    input: string,
    _options?: BoxOptions,
    context?: BoxSourceContext,
  ): Promise<Box[]> {
    if (context?.preview) {
      const regularInput = trim(input).toLowerCase();
      if (!['ip', 'myip'].includes(regularInput)) return [];
      return [
        new BoxBuilder(
          'My IP',
          'Network lookup is disabled in the preview. Use this tool on the home screen.',
        )
          .setView('default')
          .setShowExpandButton(false)

          .build(),
      ];
    }

    const match = await this.checkMatch(input, context?.signal);
    if (!match) {
      return [];
    }

    const { ip, location, colocation } = match;

    let displayText = ip;
    if (location && colocation) {
      displayText = `${ip} (${colocation}, ${location})`;
    }

    return [
      new BoxBuilder('My IP', displayText)
        .setView('default')
        .setShowExpandButton(false)

        .build(),
    ];
  },
};

export default MyIPBoxSource;
