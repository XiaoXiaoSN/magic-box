import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 10_000;

const REGEX_SPECIAL = new Set([
  '.',
  '+',
  '*',
  '?',
  '(',
  ')',
  '{',
  '}',
  '[',
  ']',
  '^',
  '$',
  '|',
  '\\',
]);

function escapeRegexChar(char: string): string {
  return REGEX_SPECIAL.has(char) ? `\\${char}` : char;
}

function parseCharacterClass(
  glob: string,
  start: number,
): { regex: string; next: number } | null {
  let index = start + 1;
  const negated = glob[index] === '!';
  if (negated) index++;

  const contentStart = index;
  if (glob[index] === ']') index++;
  while (index < glob.length && glob[index] !== ']') {
    index += glob[index] === '\\' && index + 1 < glob.length ? 2 : 1;
  }
  if (index === glob.length) return null;

  const content = glob.slice(contentStart, index);
  if (content.length === 0) return null;

  let regex = `[${negated ? '^' : ''}`;
  for (let charIndex = 0; charIndex < content.length; charIndex++) {
    const char = content[charIndex];
    if (char === '\\' && charIndex + 1 < content.length) {
      const escaped = content[++charIndex];
      regex += ['\\', ']', '^', '-'].includes(escaped)
        ? `\\${escaped}`
        : escaped;
    } else if (char === '\\' || char === ']' || char === '^') {
      regex += `\\${char}`;
    } else if (
      char === '-' &&
      (charIndex === 0 || charIndex === content.length - 1)
    ) {
      regex += '\\-';
    } else {
      regex += char;
    }
  }

  return { regex: `${regex}]`, next: index + 1 };
}

function globToRegex(glob: string): string {
  let result = '^';
  let index = 0;

  while (index < glob.length) {
    const char = glob[index];

    if (char === '\\') {
      const next = glob[index + 1];
      result += next === undefined ? '\\\\' : escapeRegexChar(next);
      index += next === undefined ? 1 : 2;
    } else if (char === '*') {
      if (glob[index + 1] === '*') {
        if (glob[index + 2] === '/') {
          result += '(?:.*/)?';
          index += 3;
        } else {
          result += '.*';
          index += 2;
        }
      } else {
        result += '[^/]*';
        index++;
      }
    } else if (char === '?') {
      result += '[^/]';
      index++;
    } else if (char === '[') {
      const parsed = parseCharacterClass(glob, index);
      if (parsed) {
        result += parsed.regex;
        index = parsed.next;
      } else {
        result += '\\[';
        index++;
      }
    } else {
      result += escapeRegexChar(char);
      index++;
    }
  }

  return `${result}$`;
}

export const GlobToRegexBoxSource = {
  defaultDisabled: true,
  name: 'Glob to Regex',
  description:
    'Convert a shell glob pattern (*, ?, [...], **) into an anchored regular expression.',
  defaultInput: 'src/**/*.ts\n::glob2regex',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'glob2regex', 'globregex')) return [];
    if (input.length > MAX_INPUT) return [];

    const pattern = trim(input);
    if (pattern.length === 0) return [];
    const regex = globToRegex(pattern);

    return [
      new BoxBuilder('Glob to Regex', regex)
        .setView('default')
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default GlobToRegexBoxSource;
