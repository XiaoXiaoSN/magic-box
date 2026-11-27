import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_PREFS } from '../../contexts/PreferencesContext';
import {
  buildDefaultSettings,
  SETTINGS_STORAGE_KEY,
} from '../../contexts/SettingsContext';
import { LOCAL_PREFS_KEY } from '../../functions/localPrefs';
import {
  decodePortableConfig,
  encodePortableConfig,
  portablePrefs,
} from './config';
import { applySettingsFile } from './fileSettings';

describe('versioned settings files', () => {
  const config = () => ({
    locale: 'en' as const,
    prefs: portablePrefs(DEFAULT_PREFS),
    settings: buildDefaultSettings(),
  });

  it('uses the shared schema and handles unknown tools and invalid preferences', () => {
    const original = config();
    const saved = encodePortableConfig(original);
    const boxes = {
      ...saved.settings.boxes,
      upcoming: { id: 'upcoming', enabled: true, secondaryOrder: 100 },
    };
    expect(
      decodePortableConfig({
        ...saved,
        settings: { ...saved.settings, boxes },
      }),
    ).toEqual(original);
    expect(() =>
      decodePortableConfig({
        ...saved,
        prefs: { ...saved.prefs, timezoneOffset: '8' },
      }),
    ).toThrow('Invalid settings backup');
    expect(saved.prefs).not.toHaveProperty('toolboxUrl');
    expect(saved.prefs).not.toHaveProperty('analytics');
  });

  it('restores previous preferences if the second storage write fails', () => {
    localStorage.setItem(LOCAL_PREFS_KEY, '{"theme":"dark"}');
    localStorage.setItem(SETTINGS_STORAGE_KEY, '{"existing":true}');
    const original = localStorage.setItem.bind(localStorage);
    const setItem = vi
      .spyOn(localStorage, 'setItem')
      .mockImplementation((key, value) => {
        if (key === SETTINGS_STORAGE_KEY)
          throw new DOMException('Quota exceeded', 'QuotaExceededError');
        original(key, value);
      });
    try {
      expect(() => applySettingsFile(config())).toThrow('Quota exceeded');
      expect(localStorage.getItem(LOCAL_PREFS_KEY)).toBe('{"theme":"dark"}');
      expect(localStorage.getItem(SETTINGS_STORAGE_KEY)).toBe(
        '{"existing":true}',
      );
    } finally {
      setItem.mockRestore();
    }
  });
});
