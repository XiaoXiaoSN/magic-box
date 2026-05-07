import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { isString, trim } from '@functions/helper';
import type { Box } from '@modules/Box';
import { BoxBuilder } from '@modules/Box';

const PriorityEscapeString = 15;

// Comprehensive ANSI escape sequence regex:
// Supports:
// - Real ESC character (\x1B)
// - Literal "^[" (common representation in logs)
// - \x1B[@-Z\\-_]       two-char escape sequences (e.g. \x1BM for reverse index)
// - \x1B\[[0-?]*[ -/]*[@-~]  CSI sequences (colors, cursor movement, erase, etc.)
// biome-ignore lint/suspicious/noControlCharactersInRegex: needed to match ANSI escape sequences
const ANSI_REGEX = /(?:\x1B|\^\[)(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g;

interface Match {
  unescapedText: string;
}

function stripAnsi(str: string): string {
  return str.replace(ANSI_REGEX, '');
}

function unescapeString(input: string): string {
  let result = input;

  // Strip wrapping double-quotes if the whole string is quoted: "..."
  if (result.startsWith('"') && result.endsWith('"') && result.length >= 2) {
    result = result.slice(1, -1);
  }

  // Unescape backslash-escaped characters
  result = result
    .replace(/\\"/g, '"')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\r/g, '\r')
    .replace(/\\\\/g, '\\');

  // Strip ANSI codes
  result = stripAnsi(result);

  return result;
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

    const hasEscapedQuotes = regularInput.includes('\\"');
    const hasAnsi = ANSI_REGEX.test(regularInput);
    // Reset lastIndex since the regex is global/stateful
    ANSI_REGEX.lastIndex = 0;

    if (!hasEscapedQuotes && !hasAnsi) {
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
        .setTemplate(DefaultBoxTemplate)
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default EscapeStringBoxSource;
