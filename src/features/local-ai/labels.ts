import type { AILanguage, AILanguagePref, AITask } from './types';

// The UI locales Magic Box ships. Declared here rather than imported from
// `src/i18n` so this module stays free of app-level dependencies.
export type UILocale = 'en' | 'tw';

// Task and output-language names are needed by two bundles: the lazy panel
// chunk and the eagerly loaded settings page. Keeping them in one dependency-
// free module means the settings page never pulls in `messages.ts`, and a
// renamed task can never read differently in the two places.
export const AI_TASKS: readonly AITask[] = [
  'ask',
  'translate',
  'rewrite',
  'summarize',
];

export const aiTaskLabels: Record<UILocale, Record<AITask, string>> = {
  en: {
    ask: 'Ask',
    translate: 'Translate',
    rewrite: 'Rewrite',
    summarize: 'Summarize',
  },
  tw: {
    ask: '問答',
    translate: '翻譯',
    rewrite: '改寫',
    summarize: '摘要',
  },
};

// Endonyms: a language names itself the same way in either UI locale.
export const AI_LANGUAGES: readonly AILanguage[] = ['zh-TW', 'en', 'ja'];

export const aiLanguageLabels: Record<AILanguage, string> = {
  'zh-TW': '繁體中文',
  en: 'English',
  ja: '日本語',
};

export const aiAutoLanguageLabels: Record<UILocale, string> = {
  en: 'Follow app language',
  tw: '跟隨介面語言',
};

// `auto` is resolved at request time, not at write time: switching the app
// language has to move the model's output language with it.
export const resolveAILanguage = (
  pref: AILanguagePref,
  locale: UILocale,
): AILanguage => {
  if (pref !== 'auto') return pref;
  return locale === 'tw' ? 'zh-TW' : 'en';
};

// Shared by the in-box step button and the dialog readout, so the number a user
// commits to and the number they inspect can never be formatted differently.
export const formatModelSize = (bytes: number, locale: UILocale): string => {
  const mib = new Intl.NumberFormat(locale === 'tw' ? 'zh-TW' : 'en', {
    maximumFractionDigits: 1,
  }).format(bytes / 1024 / 1024);
  return `${mib} MiB`;
};

export const isAITask = (value: unknown): value is AITask =>
  AI_TASKS.includes(value as AITask);

export const isAILanguagePref = (value: unknown): value is AILanguagePref =>
  value === 'auto' || AI_LANGUAGES.includes(value as AILanguage);
