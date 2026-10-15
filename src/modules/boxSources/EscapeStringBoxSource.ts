import { isString, trim } from '@functions/helper';
import type { Box } from '@modules/Box';
import { BoxBuilder } from '@modules/Box';

const PriorityEscapeString = 15;

// real ESC supports both two-character and CSI sequences; caret notation is only CSI.
const ANSI_REGEX =
  // biome-ignore lint/suspicious/noControlCharactersInRegex: needed to match ANSI escape sequences
  /(?:\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])|\^\[\[[0-?]*[ -/]*[@-~])/g;

const JSON_ESCAPE_REGEX = /\\(u[0-9a-fA-F]{4}|["\\/bfnrt])/g;
const JSON_ESCAPE_VALUES: Record<string, string> = {
  '"': '"',
  '\\': '\\',
  '/': '/',
  b: '\b',
  f: '\f',
  n: '\n',
  r: '\r',
  t: '\t',
};

interface Match {
  unescapedText: string;
}

function stripAnsi(str: string): string {
  return str.replace(ANSI_REGEX, '');
}

function decodeJsonEscapes(input: string): string {
  return input.replace(JSON_ESCAPE_REGEX, (_match, token: string) => {
    if (token[0] === 'u') {
      return String.fromCharCode(Number.parseInt(token.slice(1), 16));
    }
    return JSON_ESCAPE_VALUES[token];
  });
}

function unescapeString(input: string): string {
  let decoded: string;

  if (input.startsWith('"') && input.endsWith('"') && input.length >= 2) {
    try {
      const parsed: unknown = JSON.parse(input);
      decoded = typeof parsed === 'string' ? parsed : decodeJsonEscapes(input);
    } catch {
      decoded = decodeJsonEscapes(input.slice(1, -1));
    }
  } else {
    decoded = decodeJsonEscapes(input);
  }

  return stripAnsi(decoded);
}

export const EscapeStringBoxSource = {
  name: 'Escape String',
  description:
    'Unescape JSON-escaped strings (\\") and strip ANSI color codes.',
  defaultInput: '"{\\"message\\":\\"something here\\"}"',
  tag: '\\',
  kind: 'Decode',
  priority: PriorityEscapeString,

  checkMatch(input: string): Match | undefined {
    if (!isString(input)) {
      return undefined;
    }
    const regularInput = trim(input);
    if (!regularInput) {
      return undefined;
    }

    const unescapedText = unescapeString(regularInput);

    // If result is unchanged, nothing to show
    if (unescapedText === regularInput) {
      return undefined;
    }

    return { unescapedText };
  },

  async generateBoxes(input: string): Promise<Box[]> {
    const match = this.checkMatch(input);
    if (!match) {
      return [];
    }

    const { unescapedText } = match;
    return [
      new BoxBuilder('Escape String', unescapedText)
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default EscapeStringBoxSource;
