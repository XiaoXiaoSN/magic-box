import { patchLocalPrefs, readLocalPrefs } from '@functions/localPrefs';

import en, { type Translations } from './en';
import zhTW from './zhTW';

export type { Translations } from './en';

export type Locale = 'en' | 'tw';

export const translations: Record<Locale, Translations> = {
  en,
  tw: zhTW,
};

export const DEFAULT_LOCALE: Locale = 'en';

export function isLocale(value: unknown): value is Locale {
  return value === 'en' || value === 'tw';
}

export function loadLocale(): Locale {
  const prefs = readLocalPrefs();
  return isLocale(prefs.locale) ? prefs.locale : DEFAULT_LOCALE;
}

export function persistLocale(locale: Locale): void {
  patchLocalPrefs({ locale });
}
