import { describe, expect, it } from 'vitest';

import { DurationBoxSource } from '../../modules/boxSources/DurationBoxSource';
import { SettingsStorage } from '../SettingsContext';

const SETTINGS_STORAGE_KEY = 'mb_settings';

describe('SettingsStorage', () => {
  it('enables Duration by default so ::duration can run on the home screen', () => {
    const settings = SettingsStorage.get();

    expect(settings.boxes[DurationBoxSource.name]?.enabled).toBe(true);
  });

  it('adds Duration as enabled when loading older settings without the source', () => {
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        boxes: {
          'Word Count': {
            id: 'Word Count',
            enabled: true,
            priority: 10,
            secondaryOrder: 0,
          },
        },
      }),
    );

    const settings = SettingsStorage.get();

    expect(settings.boxes[DurationBoxSource.name]?.enabled).toBe(true);
  });

  it('migrates old settings that captured Duration as disabled', () => {
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        boxes: {
          [DurationBoxSource.name]: {
            id: DurationBoxSource.name,
            enabled: false,
            priority: 10,
            secondaryOrder: 0,
          },
        },
      }),
    );

    const settings = SettingsStorage.get();

    expect(settings.boxes[DurationBoxSource.name]?.enabled).toBe(true);
    expect(settings.version).toBe(1);
  });

  it('preserves a current-version user disable for Duration', () => {
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        boxes: {
          [DurationBoxSource.name]: {
            id: DurationBoxSource.name,
            enabled: false,
            priority: 10,
            secondaryOrder: 0,
          },
        },
      }),
    );

    const settings = SettingsStorage.get();

    expect(settings.boxes[DurationBoxSource.name]?.enabled).toBe(false);
  });
});
