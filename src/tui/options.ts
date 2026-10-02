import { setRuntimePrefs } from '@functions/runtimePrefs';
import {
  DEFAULT_TIMEZONE_OFFSET,
  isValidTimezoneOffset,
} from '@functions/timezone';

export interface TerminalOptions {
  input: string;
  json: boolean;
  help: boolean;
  prefsPath?: string;
  timezoneOffset?: number;
  locale?: string;
}

export function parseArguments(args: string[]): TerminalOptions {
  const result: TerminalOptions = { input: '', json: false, help: false };
  const input: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--') {
      input.push(...args.slice(index + 1));
      break;
    }
    if (arg === '--json') result.json = true;
    else if (arg === '--help' || arg === '-h') result.help = true;
    else if (arg === '--timezone' || arg === '--locale' || arg === '--prefs') {
      const value = args[++index];
      if (value === undefined || value.trim() === '')
        throw new Error(`${arg} needs a value`);
      if (arg === '--prefs') result.prefsPath = value;
      else if (arg === '--locale') {
        if (!['en', 'tw', 'zh_TW'].includes(value))
          throw new Error('Locale must be en or tw');
        result.locale = value === 'tw' ? 'zh_TW' : value;
      } else {
        const offset = Number(value);
        if (!isValidTimezoneOffset(offset))
          throw new Error(
            'Timezone must be a supported offset between -12 and 14',
          );
        result.timezoneOffset = offset;
      }
    } else if (arg.startsWith('--')) throw new Error(`Unknown option: ${arg}`);
    else input.push(arg);
  }
  result.input = input.join(' ');
  return result;
}

// Accept the web mb_prefs JSON object without importing React/localStorage.
// Explicit CLI values override the file. Do not import network/telemetry prefs.
export function applyTerminalPreferences(
  options: TerminalOptions,
  saved: unknown = {},
): void {
  if (saved === null || typeof saved !== 'object' || Array.isArray(saved))
    throw new Error('Preferences must be a JSON object');
  const prefs = saved as Record<string, unknown>;
  if (
    prefs.timezoneOffset !== undefined &&
    (typeof prefs.timezoneOffset !== 'number' ||
      !isValidTimezoneOffset(prefs.timezoneOffset))
  ) {
    throw new Error('Invalid timezoneOffset in preferences');
  }
  const locale = prefs.locale;
  if (locale !== undefined && !['en', 'tw', 'zh_TW'].includes(String(locale)))
    throw new Error('Invalid locale in preferences');
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

export const terminalHelp = `Usage: bun run tui [--json] [--timezone HOURS] [--locale en|tw] [--prefs FILE] [--] [INPUT]
Input: command arguments, piped stdin, or an interactive prompt.
Default timezone: UTC+8. --prefs reads exported web mb_prefs JSON (no automatic browser access).
Interactive: Enter converts, Ctrl+N/P selects a result, Ctrl+Y copies via OSC 52, Ctrl+C exits.
Use --json for machine-readable output. Empty piped input exits without an interactive prompt.
Network and browser-only tools are intentionally excluded.\n`;
