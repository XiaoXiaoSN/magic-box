import env from '@global/env';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  getLocale,
  getShortenUrl,
  getTimezoneOffset,
  getToolboxUrl,
  isAnalyticsEnabled,
  setRuntimePrefs,
} from '../runtimePrefs';
import { DEFAULT_TIMEZONE_OFFSET } from '../timezone';

describe('runtimePrefs', () => {
  beforeEach(() => {
    // reset to defaults so cases stay independent.
    setRuntimePrefs({
      timezoneOffset: DEFAULT_TIMEZONE_OFFSET,
      toolboxUrl: '',
      shortenUrl: '',
      analytics: true,
      locale: 'en',
    });
  });

  it('defaults the timezone offset to +8', () => {
    expect(getTimezoneOffset()).toBe(8);
  });

  it('falls back to env hosts when overrides are blank', () => {
    expect(getToolboxUrl()).toBe(env.TOOLBOX_URL);
    expect(getShortenUrl()).toBe(env.SHORTEN_URL);
  });

  it('falls back to env hosts when overrides are whitespace only', () => {
    setRuntimePrefs({ toolboxUrl: '   ', shortenUrl: '  ' });
    expect(getToolboxUrl()).toBe(env.TOOLBOX_URL);
    expect(getShortenUrl()).toBe(env.SHORTEN_URL);
  });

  it('uses configured hosts when provided', () => {
    setRuntimePrefs({
      toolboxUrl: 'https://tool.example.com',
      shortenUrl: 'https://s.example.com',
    });
    expect(getToolboxUrl()).toBe('https://tool.example.com');
    expect(getShortenUrl()).toBe('https://s.example.com');
  });

  it('exposes the analytics gate and locale', () => {
    expect(isAnalyticsEnabled()).toBe(true);
    setRuntimePrefs({ analytics: false, locale: 'zh_TW' });
    expect(isAnalyticsEnabled()).toBe(false);
    expect(getLocale()).toBe('zh_TW');
  });
});
