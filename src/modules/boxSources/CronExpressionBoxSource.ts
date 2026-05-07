import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { isString, trim } from '@functions/helper';
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
      let locale = 'en';
      if (options !== null) {
        const lang = extractOptionKeys(options, 'l', 'lang', 'locale');
        if (lang !== null && typeof lang === 'string') {
          locale = localeMap.get(lang.toLowerCase()) ?? lang;
        }
      }

      const { default: cronstrue } = await import('cronstrue/i18n');
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
        .setTemplate(DefaultBoxTemplate)
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default CronExpressionBoxSource;
