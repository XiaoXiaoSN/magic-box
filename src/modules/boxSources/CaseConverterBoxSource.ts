import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { isString, trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// split input into lowercase tokens by whitespace, separators, and camelCase/PascalCase boundaries
function tokenize(input: string): string[] {
  // insert a space before every uppercase letter that follows a lowercase letter or digit (camelCase boundary)
  const expanded = input
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    // insert a space before a run of uppercase letters followed by a lowercase letter (e.g. XMLParser → XML Parser)
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');

  return expanded
    .split(/[\s\-_.]+/)
    .map((t) => t.toLowerCase())
    .filter((t) => t.length > 0);
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function toCamelCase(tokens: string[]): string {
  return tokens.map((t, i) => (i === 0 ? t : capitalize(t))).join('');
}

function toPascalCase(tokens: string[]): string {
  return tokens.map(capitalize).join('');
}

function toSnakeCase(tokens: string[]): string {
  return tokens.join('_');
}

function toKebabCase(tokens: string[]): string {
  return tokens.join('-');
}

function toConstantCase(tokens: string[]): string {
  return tokens.map((t) => t.toUpperCase()).join('_');
}

function toDotCase(tokens: string[]): string {
  return tokens.join('.');
}

function toTitleCase(tokens: string[]): string {
  return tokens.map(capitalize).join(' ');
}

function toSentenceCase(tokens: string[]): string {
  return tokens.map((t, i) => (i === 0 ? capitalize(t) : t)).join(' ');
}

export const CaseConverterBoxSource = {
  name: 'Case Converter',
  description:
    'Convert text between camelCase, snake_case, kebab-case, PascalCase, CONSTANT_CASE, dot.case, Title Case and Sentence case.',
  defaultInput: 'hello world foo bar ::case',
  tag: 'Aa',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    // gate on ::case option so this never intercepts unrelated inputs
    if (!hasOptionKeys(options, 'case')) return [];
    if (!isString(input) || trim(input).length === 0) return [];

    const tokens = tokenize(trim(input));
    if (tokens.length === 0) return [];

    const output: Record<string, string> = {
      camelCase: toCamelCase(tokens),
      PascalCase: toPascalCase(tokens),
      snake_case: toSnakeCase(tokens),
      'kebab-case': toKebabCase(tokens),
      CONSTANT_CASE: toConstantCase(tokens),
      'dot.case': toDotCase(tokens),
      'Title Case': toTitleCase(tokens),
      'Sentence case': toSentenceCase(tokens),
    };

    const content = Object.entries(output)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    return [
      new BoxBuilder('Case Converter', content)
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(output)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default CaseConverterBoxSource;
