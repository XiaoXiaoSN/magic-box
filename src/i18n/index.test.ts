import { LOCAL_PREFS_KEY } from '@functions/localPrefs';
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_LOCALE, loadLocale, persistLocale } from './index';

describe('locale preferences', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loads a valid locale from shared local preferences', () => {
    localStorage.setItem(LOCAL_PREFS_KEY, JSON.stringify({ locale: 'tw' }));

    expect(loadLocale()).toBe('tw');
  });

  it('falls back to the default locale for invalid stored values', () => {
    localStorage.setItem(LOCAL_PREFS_KEY, JSON.stringify({ locale: 'fr' }));

    expect(loadLocale()).toBe(DEFAULT_LOCALE);
  });

  it('preserves other preferences when persisting locale', () => {
    localStorage.setItem(
      LOCAL_PREFS_KEY,
      JSON.stringify({ theme: 'dark', copyMode: 'paste' }),
    );

    persistLocale('tw');

    expect(JSON.parse(localStorage.getItem(LOCAL_PREFS_KEY) ?? '{}')).toEqual({
      theme: 'dark',
      copyMode: 'paste',
      locale: 'tw',
    });
  });
});
