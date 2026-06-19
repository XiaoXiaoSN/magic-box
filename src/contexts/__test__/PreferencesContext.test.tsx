import { LOCAL_PREFS_KEY } from '@functions/localPrefs';
import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  DEFAULT_PREFS,
  isValidServerUrl,
  loadPrefs,
  PreferencesProvider,
  usePreferences,
} from '../PreferencesContext';

const Probe = (): React.JSX.Element => {
  const { prefs, setPref } = usePreferences();
  return (
    <div>
      <span data-testid="tz">{prefs.timezoneOffset}</span>
      <span data-testid="theme">{prefs.theme}</span>
      <button onClick={() => setPref('timezoneOffset', -5)} type="button">
        set-tz
      </button>
    </div>
  );
};

describe('PreferencesContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('loadPrefs defaults', () => {
    it('defaults timezoneOffset to +8 and servers to blank', () => {
      const prefs = loadPrefs();
      expect(prefs.timezoneOffset).toBe(8);
      expect(prefs.toolboxUrl).toBe('');
      expect(prefs.shortenUrl).toBe('');
      expect(prefs).toEqual(DEFAULT_PREFS);
    });

    it('rejects out-of-range timezone and invalid server urls from storage', () => {
      localStorage.setItem(
        LOCAL_PREFS_KEY,
        JSON.stringify({
          timezoneOffset: 99,
          toolboxUrl: 'not-a-url',
          shortenUrl: 'ftp://nope.example',
        }),
      );
      const prefs = loadPrefs();
      expect(prefs.timezoneOffset).toBe(8);
      expect(prefs.toolboxUrl).toBe('');
      expect(prefs.shortenUrl).toBe('');
    });

    it('keeps valid stored values', () => {
      localStorage.setItem(
        LOCAL_PREFS_KEY,
        JSON.stringify({
          timezoneOffset: -3,
          toolboxUrl: 'https://tool.example.com',
        }),
      );
      const prefs = loadPrefs();
      expect(prefs.timezoneOffset).toBe(-3);
      expect(prefs.toolboxUrl).toBe('https://tool.example.com');
    });
  });

  describe('isValidServerUrl', () => {
    it('accepts blank and http(s) urls, rejects others', () => {
      expect(isValidServerUrl('')).toBe(true);
      expect(isValidServerUrl('   ')).toBe(true);
      expect(isValidServerUrl('https://a.example')).toBe(true);
      expect(isValidServerUrl('http://a.example')).toBe(true);
      expect(isValidServerUrl('ftp://a.example')).toBe(false);
      expect(isValidServerUrl('garbage')).toBe(false);
    });
  });

  it('persists updates to mb_prefs storage', () => {
    render(
      <PreferencesProvider>
        <Probe />
      </PreferencesProvider>,
    );

    expect(screen.getByTestId('tz').textContent).toBe('8');

    act(() => {
      screen.getByText('set-tz').click();
    });

    expect(screen.getByTestId('tz').textContent).toBe('-5');
    const stored = JSON.parse(localStorage.getItem(LOCAL_PREFS_KEY) ?? '{}');
    expect(stored.timezoneOffset).toBe(-5);
  });
});
