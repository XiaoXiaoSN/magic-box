import { isString, trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, errorBox, hasOptionKeys, keyValueBox } from '@modules/Box';

const Priority = 10;
const BoxName = 'Case Converter';

// split input into lowercase tokens by whitespace, separators, and camelCase/PascalCase boundaries
function tokenize(input: string): string[] {
  // insert a space before every uppercase letter that follows a lowercase letter or digit (camelCase boundary)
  const expanded = input
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    // split an acronym from a following word (XMLParser → XML Parser); the
    // fixed-width lookahead avoids the catastrophic backtracking that
    // `([A-Z]+)([A-Z][a-z])` exhibits on long uppercase runs (ReDoS)
    .replace(/([A-Z])(?=[A-Z][a-z])/g, '$1 ');

  return expanded
    .split(/[\s\-_.]+/)
    .map((t) => t.toLowerCase())
    .filter((t) => t.length > 0);
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

interface CaseFormat {
  label: string;
  // option keys that select only this format; `::case=<key>` accepts them too
  keys: string[];
  // word-based formats read the tokens; lowercase/UPPERCASE map the text as-is
  convert: (tokens: string[], text: string) => string;
}

const FORMATS: CaseFormat[] = [
  {
    label: 'camelCase',
    keys: ['camel', 'camelcase'],
    convert: (tokens) =>
      tokens.map((t, i) => (i === 0 ? t : capitalize(t))).join(''),
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
    label: 'kebab-case',
    keys: ['kebab', 'kebabcase'],
    convert: (tokens) => tokens.join('-'),
  },
  {
    label: 'CONSTANT_CASE',
    keys: ['constant', 'constantcase'],
    convert: (tokens) => tokens.map((t) => t.toUpperCase()).join('_'),
  },
  {
    label: 'dot.case',
    keys: ['dot', 'dotcase'],
    convert: (tokens) => tokens.join('.'),
  },
  {
    label: 'Title Case',
    keys: ['title', 'titlecase'],
    convert: (tokens) => tokens.map(capitalize).join(' '),
  },
  {
    label: 'Sentence case',
    keys: ['sentence', 'sentencecase'],
    convert: (tokens) =>
      tokens.map((t, i) => (i === 0 ? capitalize(t) : t)).join(' '),
  },
  {
    label: 'lowercase',
    keys: ['lower', 'lowercase'],
    convert: (_tokens, text) => text.toLowerCase(),
  },
  {
    label: 'UPPERCASE',
    keys: ['upper', 'uppercase'],
    convert: (_tokens, text) => text.toUpperCase(),
  },
];

const FORMAT_KEYS = FORMATS.flatMap((f) => f.keys);

// `::case=kebab-case`, `::case=Snake_Case` and `::case=snake` all name the
// same format, so compare with case and separators stripped
function normalizeFormatName(name: string): string {
  return name.toLowerCase().replace(/[\s\-_.]+/g, '');
}

function findFormat(name: string): CaseFormat | undefined {
  const key = normalizeFormatName(name);
  return FORMATS.find((f) => f.keys.includes(key));
}

export const CaseConverterBoxSource = {
  defaultDisabled: true,
  name: BoxName,
  description:
    'Convert text between camelCase, PascalCase, snake_case, kebab-case, CONSTANT_CASE, dot.case, Title Case, Sentence case, lowercase and UPPERCASE. ::case lists every format; ::case=<format> or a single-format option (::camel, ::snake, ::kebab, ::upper, ::lower, …) shows just that one.',
  defaultInput: 'hello world foo bar\n::case',
  tag: 'Aa',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    // gate on the case options so this never intercepts unrelated inputs
    if (!hasOptionKeys(options, 'case', ...FORMAT_KEYS)) return [];
    if (!isString(input)) return [];

    const text = trim(input);
    const tokens = tokenize(text);
    if (tokens.length === 0) return [];

    // `::case=<format>` and the single-format keys pick formats and may be
    // combined; a bare `::case` with nothing picked lists every format
    const caseValue = options?.case;
    const selected = new Set<CaseFormat>();
    if (typeof caseValue === 'string') {
      const format = findFormat(caseValue);
      if (!format) {
        return [
          errorBox(
            BoxName,
            `Unknown case "${caseValue}". Use one of: ${FORMATS.map((f) => f.keys[0]).join(', ')}.`,
            { priority: this.priority },
          ),
        ];
      }
      selected.add(format);
    }
    for (const format of FORMATS) {
      if (hasOptionKeys(options, ...format.keys)) selected.add(format);
    }

    if (selected.size === 0) {
      const output = Object.fromEntries(
        FORMATS.map((f) => [f.label, f.convert(tokens, text)]),
      );
      return [
        keyValueBox('keyValue', BoxName, output, {
          priority: this.priority,
        }),
      ];
    }

    // one box per requested format so its copy button yields the bare value
    return FORMATS.filter((f) => selected.has(f)).map((format) =>
      new BoxBuilder(format.label, format.convert(tokens, text))
        .setView('default')
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build(),
    );
  },
};

export default CaseConverterBoxSource;
