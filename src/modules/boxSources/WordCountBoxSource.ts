import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { isString, trim } from '@functions/helper';
import type { Box } from '@modules/Box';
import { keyValueBox } from '@modules/Box';

const Priority = 0;

interface Match {
  text: string;
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
  description: 'Count the lines, words and characters in any input.',
  defaultInput: `There are so many sounds in the world.
i'mdifficult
`,
  tag: '#',
  kind: 'Analyze',
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

    const output: Record<string, string> = {
      lines: lines.toString(),
      words: words.toString(),
      characters: characters.toString(),
    };

    return [
      keyValueBox(KeyValueBoxTemplate, 'Word Count', output, {
        priority: this.priority,
      }),
    ];
  },
};

export default WordCountBoxSource;
