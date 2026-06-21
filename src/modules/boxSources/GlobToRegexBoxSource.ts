import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 10_000;

// regex-special chars that have no meaning in glob syntax and must be escaped
const REGEX_SPECIAL = new Set([
  '.',
  '+',
  '(',
  ')',
  '{',
  '}',
  '^',
  '$',
  '|',
  '\\',
]);

// convert a glob pattern to an anchored regex string via a single left-to-right scan
function globToRegex(glob: string): string {
  let result = '^';
  let i = 0;

  while (i < glob.length) {
    const ch = glob[i];

    if (ch === '*') {
      // peek ahead: ** matches across path separators, * stays within a segment
      if (glob[i + 1] === '*') {
        result += '.*';
        i += 2;
      } else {
        result += '[^/]*';
        i += 1;
      }
    } else if (ch === '?') {
      result += '[^/]';
      i += 1;
    } else if (ch === '[') {
      // character class — pass through to regex, translating leading ! to ^
      let cls = '[';
      i += 1; // consume '['

      if (i < glob.length && glob[i] === '!') {
        cls += '^';
        i += 1;
      }

      // copy everything until the closing ']'
      while (i < glob.length && glob[i] !== ']') {
        cls += glob[i];
        i += 1;
      }

      cls += ']';
      i += 1; // consume ']'
      result += cls;
    } else if (REGEX_SPECIAL.has(ch)) {
      result += `\\${ch}`;
      i += 1;
    } else {
      result += ch;
      i += 1;
    }
  }

  result += '$';
  return result;
}

export const GlobToRegexBoxSource = {
  name: 'Glob to Regex',
  description:
    'Convert a shell glob pattern (*, ?, [...], **) into an anchored regular expression.',
  defaultInput: 'src/**/*.ts ::glob2regex',
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
    const regex = globToRegex(pattern);

    return [
      new BoxBuilder('Glob to Regex', regex)
        .setTemplate(DefaultBoxTemplate)
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default GlobToRegexBoxSource;
