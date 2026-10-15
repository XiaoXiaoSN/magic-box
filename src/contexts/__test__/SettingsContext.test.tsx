import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { boxSources } from '../../modules/boxSources';
import { DurationBoxSource } from '../../modules/boxSources/DurationBoxSource';
import {
  buildDefaultSettings,
  SettingsProvider,
  SettingsStorage,
  useSettings,
} from '../SettingsContext';

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

  it('keeps known settings, migrates the renamed source, and drops unknown ids', () => {
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        boxes: {
          'DMS Coordinates': {
            id: 'DMS Coordinates',
            enabled: true,
            priority: 42,
            secondaryOrder: 7,
          },
          'Text Diff': {
            id: 'Text Diff',
            enabled: false,
            priority: 3,
            secondaryOrder: 1,
          },
          RemovedSource: {
            id: 'RemovedSource',
            enabled: true,
            priority: 1,
            secondaryOrder: 0,
          },
        },
      }),
    );

    const settings = SettingsStorage.get();

    expect(settings.boxes['DMS Coordinates']).toBeUndefined();
    expect(settings.boxes.Coordinates).toMatchObject({
      id: 'Coordinates',
      enabled: true,
      priority: 42,
      secondaryOrder: 7,
    });
    expect(settings.boxes['Text Diff']).toMatchObject({
      enabled: false,
      priority: 3,
      secondaryOrder: 1,
    });
    expect(Object.keys(settings.boxes)).toHaveLength(boxSources.length);
    expect(settings.version).toBe(1);
  });

  it.each([
    '{}',
    'not json',
    'null',
    '{"boxes":null}',
    '[]',
  ])('returns fresh defaults for malformed storage: %s', (stored) => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, stored);

    expect(SettingsStorage.get()).toEqual(buildDefaultSettings());
  });

  it('uses defaults when the localStorage property is unavailable', () => {
    const descriptor = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('blocked', 'SecurityError');
      },
    });

    try {
      expect(SettingsStorage.get()).toEqual(buildDefaultSettings());
    } finally {
      if (descriptor) Object.defineProperty(window, 'localStorage', descriptor);
    }
  });

  it('updates settings in memory when persistence fails', () => {
    const setItem = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    let enabled = true;
    const Probe = (): React.JSX.Element => {
      const { settings, updateSettings } = useSettings();
      enabled = settings.boxes.Color?.enabled ?? true;
      return (
        <button
          onClick={() =>
            updateSettings({
              ...settings,
              boxes: {
                ...settings.boxes,
                Color: { ...settings.boxes.Color, enabled: false },
              },
            })
          }
          type="button"
        >
          disable
        </button>
      );
    };

    render(
      <SettingsProvider>
        <Probe />
      </SettingsProvider>,
    );
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'disable' }));
    });

    expect(enabled).toBe(false);
    setItem.mockRestore();
  });

  it('hydrates stored settings before the provider first render', () => {
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        boxes: {
          Color: {
            id: 'Color',
            enabled: false,
            priority: 10,
            secondaryOrder: 0,
          },
        },
      }),
    );

    let firstEnabled: boolean | undefined;
    const Probe = (): React.JSX.Element => {
      const { settings } = useSettings();
      firstEnabled ??= settings.boxes.Color?.enabled;
      return <div />;
    };

    render(
      <SettingsProvider>
        <Probe />
      </SettingsProvider>,
    );

    expect(firstEnabled).toBe(false);
  });
});
