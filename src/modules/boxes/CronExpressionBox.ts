import { DefaultBox } from '@components/Boxes';
import { isString, trim } from '@functions/helper';
import {
  Box, BoxBuilder, BoxOptions, extractOptionKeys,
} from '@modules/Box';
import cronstrue from 'cronstrue/i18n';

const PriorityCronExpression = 10;

interface Match {
  answer: string,
}

const localeMap = new Map([
  ['zh', 'zh_TW'],
  ['tw', 'zh_TW'],
  ['zh_tw', 'zh_TW'],
  ['jp', 'ja'],
]);

export const CronExpressionBoxSource = {
  checkMatch(input: string, options: BoxOptions = null): Match | undefined {
    if (!isString(input)) {
      return undefined;
    }
    if (input === '' || trim(input) === '') {
      return undefined;
    }

    const regularInput = trim(input);

    try {
      let locale = 'en';
      if (options !== null) {
        const lang = extractOptionKeys(options, 'l', 'lang', 'locale');
        if (lang !== null && typeof lang === 'string') {
          locale = localeMap.get(lang.toLowerCase()) ?? lang;
        }
      }

      const answer = cronstrue.toString(
        regularInput,
        { use24HourTimeFormat: true, locale },
      );
      if (answer === regularInput) {
        return undefined;
      }

      return { answer };
    } catch { /* */ }

    return undefined;
  },

  async generateBoxes(input: string, options: BoxOptions = null): Promise<Box[]> {
    const match = this.checkMatch(input, options);
    if (!match) {
      return [];
    }

    const { answer } = match;
    return [
      new BoxBuilder('Cron Expression', answer)
        .setPriority(PriorityCronExpression)
        .setComponent(DefaultBox)
        .build(),
    ];
  },
};

export default CronExpressionBoxSource;
