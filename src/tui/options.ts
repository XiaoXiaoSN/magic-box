import { setRuntimePrefs } from '@functions/runtimePrefs';
import {
  DEFAULT_TIMEZONE_OFFSET,
  isValidTimezoneOffset,
} from '@functions/timezone';

export class TerminalUsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TerminalUsageError';
  }
}

export interface TerminalOptions {
  input: string;
  hasInput: boolean;
  directives: string[];
  only: string[];
  json: boolean;
  raw: boolean;
  list: boolean;
  help: boolean;
  prefsPath?: string;
  timezoneOffset?: number;
  locale?: string;
}

const OPTION_NAME = /^[A-Za-z_][A-Za-z0-9_-]*$/;

export function parseArguments(args: string[]): TerminalOptions {
  const result: TerminalOptions = {
    input: '',
    hasInput: false,
    directives: [],
    only: [],
    json: false,
    raw: false,
    list: false,
    help: false,
  };
  const input: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--') {
      const remaining = args.slice(index + 1);
      input.push(...remaining.filter((value) => !value.startsWith('::')));
      result.directives.push(
        ...remaining
          .filter((value) => value.startsWith('::'))
          .map((value) => value.slice(2)),
      );
      result.hasInput ||= remaining.some((value) => !value.startsWith('::'));
      break;
    }
    if (arg === '--json') result.json = true;
    else if (arg === '--raw') result.raw = true;
    else if (arg === '--list') result.list = true;
    else if (arg === '--help' || arg === '-h') result.help = true;
    else if (arg === '--timezone' || arg === '--locale' || arg === '--prefs') {
      const value = args[++index];
      if (value === undefined || value.trim() === '')
        throw new TerminalUsageError(`${arg} needs a value`);
      if (arg === '--prefs') result.prefsPath = value;
      else if (arg === '--locale') {
        if (!['en', 'tw', 'zh_TW'].includes(value))
          throw new TerminalUsageError('Locale must be en or tw');
        result.locale = value === 'tw' ? 'zh_TW' : value;
      } else {
        const offset = Number(value);
        if (!isValidTimezoneOffset(offset))
          throw new TerminalUsageError(
            'Timezone must be a supported offset between -12 and 14',
          );
        result.timezoneOffset = offset;
      }
    } else if (arg === '--only') {
      const value = args[++index];
      if (value === undefined || value.trim() === '')
        throw new TerminalUsageError('--only needs a source id or name');
      const selectors = value.split(',').map((selector) => selector.trim());
      if (selectors.some((selector) => selector === ''))
        throw new TerminalUsageError('--only contains an empty source name');
      result.only.push(...selectors);
    } else if (arg === '--opt' || arg === '-o') {
      const value = args[++index];
      if (value === undefined || !value.includes('='))
        throw new TerminalUsageError(`${arg} needs key=value`);
      const key = value.slice(0, value.indexOf('='));
      if (!OPTION_NAME.test(key))
        throw new TerminalUsageError(`Invalid option key: ${key}`);
      result.directives.push(value);
    } else if (arg.startsWith('::')) {
      result.directives.push(arg.slice(2));
    } else if (arg.startsWith('--')) {
      throw new TerminalUsageError(`Unknown option: ${arg}`);
    } else {
      input.push(arg);
      result.hasInput = true;
    }
  }
  result.input = input.join(' ');
  if (result.json && result.raw)
    throw new TerminalUsageError('--json and --raw cannot be combined');
  if (result.list && result.raw)
    throw new TerminalUsageError('--list and --raw cannot be combined');
  if (result.list && result.hasInput)
    throw new TerminalUsageError('--list cannot be combined with input');
  if (result.list && result.directives.length > 0)
    throw new TerminalUsageError('--list cannot be combined with --opt');
  return result;
}

export function withTerminalDirectives(
  input: string,
  directives: string[],
): string {
  return [input, ...directives.map((directive) => `::${directive}`)]
    .filter((part) => part.length > 0)
    .join('\n');
}

// Accept exported web preferences without importing React or localStorage.
export function applyTerminalPreferences(
  options: TerminalOptions,
  saved: unknown = {},
): void {
  if (saved === null || typeof saved !== 'object' || Array.isArray(saved))
    throw new TerminalUsageError('Preferences must be a JSON object');
  const prefs = saved as Record<string, unknown>;
  if (
    prefs.timezoneOffset !== undefined &&
    (typeof prefs.timezoneOffset !== 'number' ||
      !isValidTimezoneOffset(prefs.timezoneOffset))
  ) {
    throw new TerminalUsageError('Invalid timezoneOffset in preferences');
  }
  const locale = prefs.locale;
  if (locale !== undefined && !['en', 'tw', 'zh_TW'].includes(String(locale)))
    throw new TerminalUsageError('Invalid locale in preferences');
  setRuntimePrefs({
    timezoneOffset:
      options.timezoneOffset ??
      (prefs.timezoneOffset as number | undefined) ??
      DEFAULT_TIMEZONE_OFFSET,
    locale:
      options.locale ??
      (locale === 'tw' ? 'zh_TW' : (locale as string | undefined)) ??
      'en',
    analytics: false,
  });
}

export const terminalHelp = `Usage: magic-box-tui [OPTIONS] [INPUT ...]
Input comes from arguments, piped stdin, or the interactive prompt. Arguments beginning with :: are option directives and are placed on separate lines.

  --json                 Print machine-readable results or source metadata
  --raw                  Print the first matching plaintext result
  --only SOURCE          Run one source by id or unambiguous name; repeat or comma-separate
  --list                 List available headless sources and their default inputs
  --opt, -o key=value    Add a shared ::option=value directive; repeat as needed
  --timezone HOURS       Set the timezone offset (default: UTC+8)
  --locale en|tw         Set the output locale
  --prefs FILE           Read exported web mb_prefs JSON
  --                     Treat remaining arguments as input
  -h, --help             Show this help

Interactive controls: type to search, Up/Down to select, Enter or y to copy, Ctrl+Y to copy from the input, Esc to exit.
Only headless, non-network sources are enabled. Empty piped input is a usage error.
`;
