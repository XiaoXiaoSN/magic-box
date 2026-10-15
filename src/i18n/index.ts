import { patchLocalPrefs, readLocalPrefs } from '@functions/localPrefs';

import en, { type Translations } from './en';
import zhTW from './zhTW';

export type {
  BoxSourceId,
  BoxSourceTranslation,
  LocalizedBoxSource,
} from './boxSources';
export {
  BOX_SOURCE_IDS,
  boxSourceTranslations,
  getBoxSourceDisplay,
  getBoxSourceId,
  getBoxSourceKind,
  kindTranslations,
} from './boxSources';

export type { Translations } from './en';

export type Locale = 'en' | 'tw';

export type IntlLocale = 'en' | 'zh-TW';

export function toIntlLocale(locale: Locale | string): IntlLocale {
  return locale === 'tw' || locale.toLowerCase().replace('_', '-') === 'zh-tw'
    ? 'zh-TW'
    : 'en';
}

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
