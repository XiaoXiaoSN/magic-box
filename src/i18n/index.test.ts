import { LOCAL_PREFS_KEY } from '@functions/localPrefs';
import { beforeEach, describe, expect, it } from 'vitest';
import { boxSources } from '../modules/boxSources';
import {
  BOX_SOURCE_IDS,
  boxSourceTranslations,
  DEFAULT_LOCALE,
  getBoxSourceDisplay,
  getBoxSourceId,
  kindTranslations,
  loadLocale,
  persistLocale,
  toIntlLocale,
  translations,
} from './index';

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

  it('covers every stable source ID in both locale metadata dictionaries', () => {
    for (const locale of ['en', 'tw'] as const) {
      expect(Object.keys(boxSourceTranslations[locale]).sort()).toEqual(
        [...BOX_SOURCE_IDS].sort(),
      );
      for (const id of BOX_SOURCE_IDS) {
        const metadata = boxSourceTranslations[locale][id];
        expect(metadata.name).not.toBe('');
        expect(metadata.description).not.toBe('');
      }
    }
  });

  it('maps every current source to localized metadata without changing its ID', () => {
    for (const source of boxSources) {
      const id = getBoxSourceId(source);
      expect(id).not.toBeNull();
      const english = getBoxSourceDisplay(source, 'en');
      const taiwan = getBoxSourceDisplay(source, 'tw');
      expect(english.name).not.toBe('');
      expect(english.description).not.toBe('');
      expect(taiwan).toEqual({
        ...boxSourceTranslations.tw[id as (typeof BOX_SOURCE_IDS)[number]],
        kind: taiwan.kind,
      });
      expect(taiwan.description).not.toBe(english.description);
    }
  });

  it('covers every current source kind in both locale dictionaries', () => {
    const kinds = [
      ...new Set(
        boxSources
          .map((source) => source.kind)
          .filter((kind): kind is string => Boolean(kind)),
      ),
    ].sort();
    for (const locale of ['en', 'tw'] as const) {
      expect(Object.keys(kindTranslations[locale]).sort()).toEqual(kinds);
      for (const kind of kinds) {
        expect(kindTranslations[locale][kind]).not.toBe('');
      }
    }
  });

  it('keeps interpolation placeholders aligned across locales', () => {
    const placeholders = (value: string): string[] =>
      [...value.matchAll(/{{([^}]+)}}/g)].map((match) => match[1]).sort();
    for (const key of Object.keys(translations.en) as Array<
      keyof typeof translations.en
    >) {
      expect(placeholders(translations.tw[key])).toEqual(
        placeholders(translations.en[key]),
      );
    }
  });

  it('maps app locale codes to Intl locale identifiers', () => {
    expect(toIntlLocale('en')).toBe('en');
    expect(toIntlLocale('tw')).toBe('zh-TW');
    expect(toIntlLocale('zh-TW')).toBe('zh-TW');
  });
});
