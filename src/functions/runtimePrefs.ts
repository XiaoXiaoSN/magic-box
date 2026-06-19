import env from '@global/env';

import { DEFAULT_TIMEZONE_OFFSET } from './timezone';

// runtime preferences are the single source of truth read by non-react code
// (box sources, telemetry). the PreferencesContext owns the react state and
// pushes every change here so plain modules stay in sync without prop drilling.

export interface RuntimePrefs {
  // default UTC offset in hours used by time-related boxes.
  timezoneOffset: number;
  // backend host overrides; empty string means "fall back to env default".
  toolboxUrl: string;
  shortenUrl: string;
  // whether anonymous telemetry (sentry) is allowed to report.
  analytics: boolean;
  // active app locale, consumed by box sources that emit localized text.
  locale: string;
}

const current: RuntimePrefs = {
  timezoneOffset: DEFAULT_TIMEZONE_OFFSET,
  toolboxUrl: '',
  shortenUrl: '',
  analytics: false,
  locale: 'en',
};

export const setRuntimePrefs = (next: Partial<RuntimePrefs>): void => {
  Object.assign(current, next);
};

export const getTimezoneOffset = (): number => current.timezoneOffset;

// resolve a configured host, falling back to the env default when blank.
export const getToolboxUrl = (): string =>
  current.toolboxUrl.trim() || env.TOOLBOX_URL;

export const getShortenUrl = (): string =>
  current.shortenUrl.trim() || env.SHORTEN_URL;

export const isAnalyticsEnabled = (): boolean => current.analytics;

export const getLocale = (): string => current.locale;
