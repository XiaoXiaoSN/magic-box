import { isString, trim } from '@functions/helper';
import { getLocale } from '@functions/runtimePrefs';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys } from '@modules/Box';

const PriorityCronExpression = 10;

interface Match {
  answer: string;
}

const localeMap = new Map([
  ['zh', 'zh_TW'],
  ['tw', 'zh_TW'],
  ['zh_tw', 'zh_TW'],
  ['jp', 'ja'],
]);

const localeLoaders: Record<string, () => Promise<unknown>> = {
  af: () => import('cronstrue/locales/af.js'),
  ar: () => import('cronstrue/locales/ar.js'),
  be: () => import('cronstrue/locales/be.js'),
  bg: () => import('cronstrue/locales/bg.js'),
  ca: () => import('cronstrue/locales/ca.js'),
  cs: () => import('cronstrue/locales/cs.js'),
  da: () => import('cronstrue/locales/da.js'),
  de: () => import('cronstrue/locales/de.js'),
  es: () => import('cronstrue/locales/es.js'),
  fa: () => import('cronstrue/locales/fa.js'),
  fi: () => import('cronstrue/locales/fi.js'),
  fr: () => import('cronstrue/locales/fr.js'),
  he: () => import('cronstrue/locales/he.js'),
  hr: () => import('cronstrue/locales/hr.js'),
  hu: () => import('cronstrue/locales/hu.js'),
  id: () => import('cronstrue/locales/id.js'),
  it: () => import('cronstrue/locales/it.js'),
  ja: () => import('cronstrue/locales/ja.js'),
  ko: () => import('cronstrue/locales/ko.js'),
  my: () => import('cronstrue/locales/my.js'),
  nb: () => import('cronstrue/locales/nb.js'),
  nl: () => import('cronstrue/locales/nl.js'),
  pl: () => import('cronstrue/locales/pl.js'),
  pt_BR: () => import('cronstrue/locales/pt_BR.js'),
  pt_PT: () => import('cronstrue/locales/pt_PT.js'),
  ro: () => import('cronstrue/locales/ro.js'),
  ru: () => import('cronstrue/locales/ru.js'),
  sk: () => import('cronstrue/locales/sk.js'),
  sl: () => import('cronstrue/locales/sl.js'),
  sr: () => import('cronstrue/locales/sr.js'),
  sv: () => import('cronstrue/locales/sv.js'),
  sw: () => import('cronstrue/locales/sw.js'),
  th: () => import('cronstrue/locales/th.js'),
  tr: () => import('cronstrue/locales/tr.js'),
  uk: () => import('cronstrue/locales/uk.js'),
  vi: () => import('cronstrue/locales/vi.js'),
  zh_CN: () => import('cronstrue/locales/zh_CN.js'),
  zh_TW: () => import('cronstrue/locales/zh_TW.js'),
};

// cheap pre-screen so cronstrue/i18n (~263KB) loads only for cron-shaped inputs.
// matches 5–7 fields of cron-allowed chars separated by whitespace.
const CRON_SHAPE = /^[\d*/,?\-LW#]+(\s+[\d*/,?\-LW#]+){4,6}$/i;

export const CronExpressionBoxSource = {
  name: 'Cron Expression',
  description: 'Translate cron expressions into human-readable schedules.',
  defaultInput: '*/5 0 12 * * ?',
  tag: '⏱',
  kind: 'Time',
  priority: PriorityCronExpression,

  async checkMatch(
    input: string,
    options: BoxOptions = null,
  ): Promise<Match | undefined> {
    if (!isString(input)) {
      return undefined;
    }
    if (input === '' || trim(input) === '') {
      return undefined;
    }

    const regularInput = trim(input);

    if (!CRON_SHAPE.test(regularInput)) {
      return undefined;
    }

    try {
      // default to the active app locale; an inline `::locale=` option wins.
      let locale = getLocale();
      if (options !== null) {
        const lang = extractOptionKeys(options, 'l', 'lang', 'locale');
        if (lang !== null && typeof lang === 'string') {
          locale = localeMap.get(lang.toLowerCase()) ?? lang;
        }
      }

      const { default: cronstrue } = await import('cronstrue');
      const loadLocale = localeLoaders[locale];
      if (loadLocale) await loadLocale();
      const answer = cronstrue.toString(regularInput, {
        use24HourTimeFormat: true,
        locale,
      });
      if (answer === regularInput) {
        return undefined;
      }

      return { answer };
    } catch {
      /* */
    }

    return undefined;
  },

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const match = await this.checkMatch(input, options);
    if (!match) {
      return [];
    }

    const { answer } = match;
    return [
      new BoxBuilder('Cron Expression', answer)
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default CronExpressionBoxSource;
