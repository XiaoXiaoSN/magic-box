import {
  getLocale,
  getTimezoneOffset,
  setRuntimePrefs,
} from '@functions/runtimePrefs';
import { afterEach, describe, expect, it } from 'vitest';
import { applyTerminalPreferences, parseArguments } from '../options';

afterEach(() => setRuntimePrefs({ timezoneOffset: 8, locale: 'en' }));

describe('terminal preferences and argument parsing', () => {
  it('parses options, negative timezones and the literal-input boundary', () => {
    expect(
      parseArguments([
        '--timezone',
        '-5',
        '--locale',
        'tw',
        '--json',
        '--',
        '--literal',
      ]),
    ).toMatchObject({
      timezoneOffset: -5,
      locale: 'zh_TW',
      json: true,
      input: '--literal',
    });
  });
  it.each([
    ['--timezone'],
    ['--timezone', 'NaN'],
    ['--timezone', '15'],
    ['--locale', 'invalid'],
    ['--unknown'],
  ])('rejects invalid arguments %j', (...args) => {
    expect(() => parseArguments(args)).toThrow();
  });
  it('shares web timezone defaults and accepts exported preferences', () => {
    const options = parseArguments([]);
    applyTerminalPreferences(options);
    expect(getTimezoneOffset()).toBe(8);
    applyTerminalPreferences(options, {
      timezoneOffset: -3,
      locale: 'tw',
      theme: 'dark',
    });
    expect(getTimezoneOffset()).toBe(-3);
    expect(getLocale()).toBe('zh_TW');
  });
  it('gives explicit arguments priority over the preferences file', () => {
    applyTerminalPreferences(
      parseArguments(['--timezone', '0', '--locale', 'en']),
      { timezoneOffset: 8, locale: 'tw' },
    );
    expect(getTimezoneOffset()).toBe(0);
    expect(getLocale()).toBe('en');
  });
  it.each([
    null,
    [],
    { timezoneOffset: '8' },
    { timezoneOffset: 99 },
    { locale: 'other' },
  ])('rejects malformed preferences %j', (saved) => {
    expect(() => applyTerminalPreferences(parseArguments([]), saved)).toThrow();
  });
});
