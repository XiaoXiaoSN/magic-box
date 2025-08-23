import { CodeBoxTemplate } from '@components/BoxTemplate';
import { isJSON, isString, trim } from '@functions/helper';
import { BoxBuilder } from '@modules/Box';

import type { Box, BoxOptions } from '@modules/Box';

const PriorityPrettyJSON = 10;

interface Match {
  jsonStr: string,
  options: BoxOptions,
}

export const PrettyJSONBoxSource = {
  name: 'Pretty JSON',
  description: 'Format a JSON string.',
  defaultInput: '{"name":"John Doe","age":30,"isStudent":false,"courses":[{"name":"History","credits":3},{"name":"Math","credits":4}]}',
  priority: PriorityPrettyJSON,

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
        .setTemplate(CodeBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default PrettyJSONBoxSource;
