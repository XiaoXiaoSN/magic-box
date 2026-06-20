import { CodeBoxTemplate } from '@components/BoxTemplate';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// classic lorem ipsum word bank — fixed order for deterministic output
const WORD_BANK = [
  'lorem',
  'ipsum',
  'dolor',
  'sit',
  'amet',
  'consectetur',
  'adipiscing',
  'elit',
  'sed',
  'do',
  'eiusmod',
  'tempor',
  'incididunt',
  'ut',
  'labore',
  'et',
  'dolore',
  'magna',
  'aliqua',
  'enim',
  'ad',
  'minim',
  'veniam',
  'quis',
  'nostrud',
  'exercitation',
  'ullamco',
  'laboris',
  'nisi',
  'aliquip',
  'ex',
  'ea',
  'commodo',
  'consequat',
];

const MAX_PARAGRAPHS = 200;
const MAX_WORDS = 5000;
const DEFAULT_PARAGRAPHS = 3;
const DEFAULT_WORDS = 50;

// words per sentence for each sentence in a paragraph (fixed layout)
const SENTENCE_LENGTHS = [8, 10, 7, 9];

// cycle through the word bank starting at the given index, returns [words, nextIndex]
function takeWords(count: number, startIndex: number): [string[], number] {
  const words: string[] = [];
  let idx = startIndex;
  for (let i = 0; i < count; i++) {
    words.push(WORD_BANK[idx % WORD_BANK.length]);
    idx++;
  }
  return [words, idx];
}

function capitalize(word: string): string {
  if (!word) return word;
  return word[0].toUpperCase() + word.slice(1);
}

function buildWords(n: number): string {
  const [words] = takeWords(n, 0);
  words[0] = capitalize(words[0]);
  return `${words.join(' ')}.`;
}

function buildParagraphs(n: number): string {
  const paragraphs: string[] = [];
  let bankIndex = 0;

  for (let p = 0; p < n; p++) {
    const sentences: string[] = [];

    for (const sentenceLen of SENTENCE_LENGTHS) {
      const [words, nextIndex] = takeWords(sentenceLen, bankIndex);
      bankIndex = nextIndex;
      words[0] = capitalize(words[0]);
      sentences.push(`${words.join(' ')}.`);
    }

    paragraphs.push(sentences.join(' '));
  }

  return paragraphs.join('\n\n');
}

function parseCount(
  value: string | boolean,
  defaultValue: number,
  max: number,
): number {
  if (value === true) return defaultValue;
  const n = Number.parseInt(value as string, 10);
  if (Number.isNaN(n) || n <= 0) return defaultValue;
  return Math.min(n, max);
}

export const LoremIpsumBoxSource = {
  name: 'Lorem Ipsum',
  description:
    'Generate placeholder lorem ipsum text. Use ::lorem=N for N paragraphs or ::words=N for N words.',
  defaultInput: 'lorem ::lorem=2',
  tag: '¶',
  kind: 'Generate',
  priority: Priority,

  async generateBoxes(
    _input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'lorem', 'words')) return [];

    let output: string;

    const wordsValue = extractOptionKeys(options, 'words');
    if (wordsValue !== null) {
      const count = parseCount(wordsValue, DEFAULT_WORDS, MAX_WORDS);
      output = buildWords(count);
    } else {
      const loremValue = extractOptionKeys(options, 'lorem');
      const count =
        loremValue !== null
          ? parseCount(loremValue, DEFAULT_PARAGRAPHS, MAX_PARAGRAPHS)
          : DEFAULT_PARAGRAPHS;
      output = buildParagraphs(count);
    }

    return [
      new BoxBuilder('Lorem Ipsum', output)
        .setTemplate(CodeBoxTemplate)
        .setPriority(Priority)
        .build(),
    ];
  },
};

export default LoremIpsumBoxSource;
