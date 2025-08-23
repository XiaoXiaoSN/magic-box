import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { isString, trim } from '@functions/helper';
import { BoxBuilder } from '@modules/Box';

import type { Box } from '@modules/Box';

const Priority = 0;

interface Match {
  text: string,
}

function countLines(str: string) {
  if (str === '') {
    return 0;
  }
  return (str.match(/\n/g) ?? []).length + 1;
}

function countWords(str: string) {
  if (str.trim() === '') {
    return 0;
  }
  return str.trim().split(/\s+/).length;
}

export const WordCountBoxSource = {
  name: 'Word Count',
  description: 'Count words, lines, and characters in a string.',
  defaultInput: `There are so many sounds in the world.
i'mdifficult
`,
  priority: Priority,

  checkMatch(input: string): Match | undefined {
    if (!isString(input)) {
      return undefined;
    }
    const regularInput = trim(input);

    if (regularInput.length <= 0) {
      return undefined;
    }

    return { text: regularInput };
  },

  async generateBoxes(input: string): Promise<Box[]> {
    const match = this.checkMatch(input);
    if (!match) {
      return [];
    }

    const lines = countLines(match.text);
    const words = countWords(match.text);
    const characters = match.text.length;

    const content = `lines: ${lines}
words: ${words}
characters: ${characters}`;

    const output: Record<string, string> = {
      lines: lines.toString(),
      words: words.toString(),
      characters: characters.toString(),
    };

    return [
      new BoxBuilder('Word Count', content)
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(output)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default WordCountBoxSource;
