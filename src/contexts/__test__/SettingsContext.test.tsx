import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

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

  it('returns fresh defaults for malformed storage', () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, '{"boxes":null}');

    const settings = SettingsStorage.get();

    expect(settings).toEqual(buildDefaultSettings());
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
