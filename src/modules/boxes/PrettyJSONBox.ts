import { CodeBox } from '@components/Boxes';
import { isJSON, isString, trim } from '@functions/helper';
import { Box, BoxBuilder, BoxOptions } from '@modules/Box';

interface Match {
  jsonStr: string,
  options: BoxOptions,
}

export const PrettyJSONBoxSource = {
  checkMatch(input: string): Match | undefined {
    if (!isString(input)) {
      return undefined;
    }
    if (input === '' || trim(input) === '') {
      return undefined;
    }
    if (!isJSON(input)) {
      return undefined;
    }

    try {
      const jsonStr = JSON.stringify(JSON.parse(input), null, '    ');
      if (jsonStr === null) {
        return undefined;
      }
      if (jsonStr === input) {
        return undefined;
      }

      return { jsonStr, options: { language: 'json' } };
    } catch { /* */ }

    return undefined;
  },

  async generateBoxes(input: string): Promise<Box[]> {
    const match = this.checkMatch(input);
    if (!match) {
      return [];
    }

    const { jsonStr, options } = match;
    return [
      new BoxBuilder('Pretty JSON', jsonStr)
        .setOptions(options)
        .setComponent(CodeBox)
        .build(),
    ];
  },
};

export default PrettyJSONBoxSource;
