import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, errorBox, hasOptionKeys, keyValueBox } from '@modules/Box';

const BoxName = 'Case Converter';
const MAX_INPUT_LENGTH = 100 * 1024;
const LOWERCASE = /^\p{Ll}$/u;
const UPPERCASE = /^\p{Lu}$/u;
const LETTER = /^\p{L}$/u;
const NUMBER = /^\p{N}$/u;
const MARK = /^\p{M}$/u;
const SEPARATOR = /^[\s._/-]$/u;

function kindOf(
  character: string,
): 'lower' | 'upper' | 'letter' | 'number' | 'mark' | 'other' {
  if (LOWERCASE.test(character)) return 'lower';
  if (UPPERCASE.test(character)) return 'upper';
  if (LETTER.test(character)) return 'letter';
  if (NUMBER.test(character)) return 'number';
  if (MARK.test(character)) return 'mark';
  return 'other';
}

function tokenize(input: string): string[] {
  const characters = [...input];
  const kinds = characters.map(kindOf);
  const tokens: string[] = [];
  let token = '';
  let previousKind: ReturnType<typeof kindOf> = 'other';

  for (let index = 0; index < characters.length; index += 1) {
    const character = characters[index];
    const kind = kinds[index];
    if (SEPARATOR.test(character)) {
      if (token) tokens.push(token.toLowerCase());
      token = '';
      previousKind = 'other';
      continue;
    }

    if (token) {
      let nextKind = 'other';
      if (previousKind === 'upper' && kind === 'upper') {
        let lookahead = index + 1;
        nextKind = kinds[lookahead] ?? 'other';
        while (nextKind === 'mark') {
          lookahead += 1;
          nextKind = kinds[lookahead] ?? 'other';
        }
      }
      const letterBoundary =
        (previousKind === 'lower' && kind === 'upper') ||
        (previousKind === 'upper' && kind === 'upper' && nextKind === 'lower');
      const numberBoundary =
        (previousKind === 'number' && kind !== 'number' && kind !== 'mark') ||
        (previousKind !== 'number' && kind === 'number');
      if (letterBoundary || numberBoundary) {
        tokens.push(token.toLowerCase());
        token = '';
      }
    }

    token += character;
    if (kind !== 'mark') previousKind = kind;
  }

  if (token) tokens.push(token.toLowerCase());
  return tokens;
}

function capitalize(word: string): string {
  const firstCodePoint = word.codePointAt(0);
  if (firstCodePoint === undefined) return word;
  const firstLength = firstCodePoint > 0xffff ? 2 : 1;
  return word.slice(0, firstLength).toUpperCase() + word.slice(firstLength);
}

interface CaseFormat {
  label: string;
  keys: readonly string[];
  convert: (tokens: string[], line: string) => string;
}

const FORMATS: readonly CaseFormat[] = [
  {
    label: 'camelCase',
    keys: ['camel', 'camelcase'],
    convert: (tokens) =>
      tokens
        .map((token, index) => (index === 0 ? token : capitalize(token)))
        .join(''),
  },
  {
    label: 'PascalCase',
    keys: ['pascal', 'pascalcase'],
    convert: (tokens) => tokens.map(capitalize).join(''),
  },
  {
    label: 'snake_case',
    keys: ['snake', 'snakecase'],
    convert: (tokens) => tokens.join('_'),
  },
  {
    label: 'CONSTANT_CASE',
    keys: ['constant', 'constantcase'],
    convert: (tokens) => tokens.join('_').toUpperCase(),
  },
  {
    label: 'kebab-case',
    keys: ['kebab', 'kebabcase'],
    convert: (tokens) => tokens.join('-'),
  },
  {
    label: 'Title Case',
    keys: ['title', 'titlecase'],
    convert: (tokens) => tokens.map(capitalize).join(' '),
  },
  {
    label: 'dot.case',
    keys: ['dot', 'dotcase'],
    convert: (tokens) => tokens.join('.'),
  },
  {
    label: 'path/case',
    keys: ['path', 'pathcase'],
    convert: (tokens) => tokens.join('/'),
  },
  {
    label: 'Sentence case',
    keys: ['sentence', 'sentencecase'],
    convert: (tokens) =>
      tokens
        .map((token, index) => (index === 0 ? capitalize(token) : token))
        .join(' '),
  },
  {
    label: 'lowercase',
    keys: ['lower', 'lowercase'],
    convert: (_tokens, line) => line.toLowerCase(),
  },
  {
    label: 'UPPERCASE',
    keys: ['upper', 'uppercase'],
    convert: (_tokens, line) => line.toUpperCase(),
  },
];

const FORMAT_KEYS = FORMATS.flatMap((format) => format.keys);

function normalizeFormatName(name: string): string {
  return name.toLowerCase().replace(/[\s._/-]+/g, '');
}

function findFormat(name: string): CaseFormat | undefined {
  const normalized = normalizeFormatName(name);
  return FORMATS.find((format) => format.keys.includes(normalized));
}

function convertLine(line: string, format: CaseFormat): string {
  if (format.label === 'lowercase' || format.label === 'UPPERCASE') {
    return format.convert([], line);
  }
  return format.convert(tokenize(line), line);
}

function isLineBreak(part: string): boolean {
  return part === '\r' || part === '\n' || part === '\r\n';
}

function convertText(input: string, format: CaseFormat): string {
  return input
    .split(/(\r\n|\r|\n)/)
    .map((part) => (isLineBreak(part) ? part : convertLine(part, format)))
    .join('');
}

function convertAll(input: string): Record<string, string> {
  const outputs: string[][] = FORMATS.map(() => []);
  for (const part of input.split(/(\r\n|\r|\n)/)) {
    if (isLineBreak(part)) {
      for (const output of outputs) output.push(part);
      continue;
    }
    const tokens = tokenize(part);
    for (let index = 0; index < FORMATS.length; index += 1) {
      outputs[index].push(FORMATS[index].convert(tokens, part));
    }
  }
  return Object.fromEntries(
    FORMATS.map((format, index) => [format.label, outputs[index].join('')]),
  );
}

export const CaseConverterBoxSource = {
  defaultDisabled: true,
  name: BoxName,
  description:
    'Convert each line between camelCase, PascalCase, snake_case, CONSTANT_CASE, kebab-case, Title Case, dot.case, path/case, Sentence case, lowercase and UPPERCASE. Use ::case to list formats or ::case=<format> to select one.',
  defaultInput: 'XMLHttpRequest userID v2ApiKey\n::case',
  tag: 'Aa',
  kind: 'Convert',

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'case', ...FORMAT_KEYS)) return [];
    const caseValue = options?.case;
    if (
      input.length > MAX_INPUT_LENGTH ||
      (typeof caseValue === 'string' && caseValue.length > 64)
    ) {
      return [
        errorBox(
          BoxName,
          'Case Converter supports input up to 100 KiB and format names up to 64 characters.',
        ),
      ];
    }
    if (input.trim().length === 0) return [];

    const selected = new Set<CaseFormat>();
    if (typeof caseValue === 'string') {
      const format = findFormat(caseValue);
      if (!format) {
        return [
          errorBox(
            BoxName,
            `Unknown case "${caseValue}". Use one of: ${FORMATS.map((format) => format.keys[0]).join(', ')}.`,
          ),
        ];
      }
      selected.add(format);
    }
    for (const format of FORMATS) {
      if (hasOptionKeys(options, ...format.keys)) selected.add(format);
    }

    if (selected.size === 0) {
      const output = convertAll(input);
      return [keyValueBox('keyValue', BoxName, output)];
    }

    return FORMATS.filter((format) => selected.has(format)).map((format) =>
      new BoxBuilder(format.label, convertText(input, format))
        .setView('default')
        .setShowExpandButton(false)

        .build(),
    );
  },
};

export default CaseConverterBoxSource;
