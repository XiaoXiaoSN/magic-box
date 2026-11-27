import { LOCAL_PREFS_KEY } from '@functions/localPrefs';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../contexts/LocaleContext';
import {
  DEFAULT_PREFS,
  PreferencesProvider,
} from '../contexts/PreferencesContext';
import {
  buildDefaultSettings,
  SETTINGS_STORAGE_KEY,
  SettingsProvider,
  useSettings,
} from '../contexts/SettingsContext';
import {
  encodePortableConfig,
  portablePrefs,
} from '../features/cloud-settings/config';
import { boxSources } from '../modules/boxSources';
import SettingsPage from './SettingsPage';

vi.mock('../features/local-ai/LocalAIModelSettings', () => ({
  default: () => null,
}));

function SettingsProbe(): React.JSX.Element {
  const { settings } = useSettings();
  return (
    <output data-testid="settings-state">{JSON.stringify(settings)}</output>
  );
}

function mount() {
  return render(
    <LocaleProvider>
      <PreferencesProvider>
        <SettingsProvider>
          <MemoryRouter>
            <SettingsPage />
            <SettingsProbe />
          </MemoryRouter>
        </SettingsProvider>
      </PreferencesProvider>
    </LocaleProvider>,
  );
}

describe('Settings timezone and defaults', () => {
  it('previews and restores a file while preserving device-only settings', async () => {
    localStorage.setItem(
      LOCAL_PREFS_KEY,
      JSON.stringify({
        collectFeedback: true,
        toolboxUrl: 'https://example.com',
      }),
    );
    localStorage.setItem('mb_search_history', '[]');
    const settings = buildDefaultSettings();
    settings.boxes.hash.enabled = false;
    settings.boxes.hash.secondaryOrder = 1;
    const before = localStorage.getItem(LOCAL_PREFS_KEY);
    const file = JSON.stringify(
      encodePortableConfig({
        locale: 'en',
        prefs: {
          ...portablePrefs(DEFAULT_PREFS),
          theme: 'dark',
          timezoneOffset: 5.75,
        },
        settings,
      }),
    );
    mount();
    fireEvent.change(screen.getByLabelText('Open settings file'), {
      target: { files: [{ size: file.length, text: async () => file }] },
    });
    const apply = await screen.findByRole('button', { name: 'Apply settings' });
    expect(localStorage.getItem(LOCAL_PREFS_KEY)).toBe(before);
    expect(
      screen.getByText('Tools with changes to order or availability (1)'),
    ).toBeVisible();
    fireEvent.click(apply);
    expect(screen.getByRole('radio', { name: 'Dark' })).toBeChecked();
    expect(
      screen.getByRole('combobox', { name: 'Default timezone' }),
    ).toHaveValue('5.75');
    expect(
      JSON.parse(localStorage.getItem(LOCAL_PREFS_KEY) ?? '{}'),
    ).toMatchObject({
      collectFeedback: true,
      toolboxUrl: 'https://example.com',
    });
    expect(
      JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) ?? '{}').boxes.hash,
    ).toMatchObject({ enabled: false, secondaryOrder: 1 });
    expect(localStorage.getItem('mb_search_history')).toBe('[]');
  });

  it('rejects an unsupported input file without changing current settings', async () => {
    mount();
    const before = localStorage.getItem(LOCAL_PREFS_KEY);
    fireEvent.change(screen.getByLabelText('Open settings file'), {
      target: { files: [{ size: 13, text: async () => '{"version":2}' }] },
    });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'unsupported version',
    );
    expect(screen.queryByRole('button', { name: 'Apply settings' })).toBeNull();
    expect(localStorage.getItem(LOCAL_PREFS_KEY)).toBe(before);
  });

  it('requires explicit opt-in for training feedback independently of analytics', () => {
    mount();
    const mode = screen.getByRole('button', { name: 'Data collection mode' });
    expect(mode).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(mode);
    expect(
      JSON.parse(localStorage.getItem(LOCAL_PREFS_KEY) ?? '{}').collectFeedback,
    ).toBe(true);
    fireEvent.click(
      screen.getByRole('button', { name: 'Restore all defaults' }),
    );
    expect(mode).toHaveAttribute('aria-pressed', 'false');
    expect(
      JSON.parse(localStorage.getItem(LOCAL_PREFS_KEY) ?? '{}').collectFeedback,
    ).toBe(false);
  });

  it('shows UTC+8 as default, saves fractional offsets, and follows the system', () => {
    mount();
    const select = screen.getByRole('combobox', { name: 'Default timezone' });
    expect(select).toHaveValue('8');
    expect(
      screen.getByRole('option', { name: 'UTC+8 (default)' }),
    ).toBeTruthy();
    expect(screen.getByRole('option', { name: 'UTC+5:45' })).toBeTruthy();
    fireEvent.change(select, { target: { value: '5.75' } });
    expect(
      JSON.parse(localStorage.getItem(LOCAL_PREFS_KEY) ?? '{}').timezoneOffset,
    ).toBe(5.75);
    fireEvent.change(select, { target: { value: 'system' } });
    expect(
      JSON.parse(localStorage.getItem(LOCAL_PREFS_KEY) ?? '{}').timezoneMode,
    ).toBe('system');
  });
  it('supports keyboard radio navigation for segmented preferences', () => {
    mount();
    const radios = within(
      screen.getByRole('radiogroup', { name: 'Theme' }),
    ).getAllByRole('radio');

    expect(radios[2]).toBeChecked();
    fireEvent.keyDown(radios[2], { key: 'ArrowLeft' });

    expect(radios[1]).toBeChecked();
    expect(radios[1]).toHaveFocus();
  });
  it('restores preferences and true source defaults without erasing history', () => {
    localStorage.setItem(
      LOCAL_PREFS_KEY,
      JSON.stringify({
        theme: 'dark',
        timezoneOffset: -5,
        timezoneMode: 'system',
        aiAutoCheck: false,
      }),
    );
    localStorage.setItem('history-marker', 'keep');
    mount();
    fireEvent.click(
      screen.getByRole('button', { name: 'Restore all defaults' }),
    );
    const prefs = JSON.parse(localStorage.getItem(LOCAL_PREFS_KEY) ?? '{}');
    expect(prefs).toMatchObject({
      theme: 'system',
      timezoneOffset: 8,
      timezoneMode: 'fixed',
      aiAutoCheck: true,
      locale: 'en',
    });
    const settings = JSON.parse(localStorage.getItem('mb_settings') ?? '{}');
    expect(settings.boxes['text-diff'].enabled).toBe(true);
    expect(settings.boxes.now.enabled).toBe(true);
    expect(localStorage.getItem('history-marker')).toBe('keep');
  });

  it('clears the settings key while applying source defaults in memory', () => {
    localStorage.setItem(
      'mb_settings',
      JSON.stringify({
        version: 1,
        boxes: Object.fromEntries(
          boxSources.map((source, index) => [
            source.name,
            {
              id: source.name,
              enabled: true,
              secondaryOrder: index,
            },
          ]),
        ),
      }),
    );

    mount();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));

    expect(localStorage.getItem('mb_settings')).toBeNull();

    expect(
      JSON.parse(screen.getByTestId('settings-state').textContent ?? '{}')
        .boxes['text-diff'].enabled,
    ).toBe(true);
    confirmSpy.mockRestore();
  });

  it('applies source defaults in memory when clearing storage fails', () => {
    localStorage.setItem(
      'mb_settings',
      JSON.stringify({
        version: 1,
        boxes: Object.fromEntries(
          boxSources.map((source, index) => [
            source.name,
            {
              id: source.name,
              enabled: false,
              secondaryOrder: index,
            },
          ]),
        ),
      }),
    );

    mount();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const clearSpy = vi
      .spyOn(window.localStorage, 'clear')
      .mockImplementation(() => {
        throw new DOMException('blocked', 'SecurityError');
      });

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));

    clearSpy.mockRestore();
    expect(
      JSON.parse(screen.getByTestId('settings-state').textContent ?? '{}')
        .boxes['text-diff'].enabled,
    ).toBe(true);
    confirmSpy.mockRestore();
  });
});
