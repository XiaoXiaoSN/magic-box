import { LOCAL_PREFS_KEY } from '@functions/localPrefs';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../contexts/LocaleContext';
import { PreferencesProvider } from '../contexts/PreferencesContext';
import { SettingsProvider, useSettings } from '../contexts/SettingsContext';
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
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'Restore defaults',
      }),
    );
    expect(mode).toHaveAttribute('aria-pressed', 'false');
    expect(
      JSON.parse(localStorage.getItem(LOCAL_PREFS_KEY) ?? '{}').collectFeedback,
    ).toBe(false);
  });

  it('shows UTC+8 as default, saves fractional offsets, and follows the system', () => {
    mount();
    const select = screen.getByRole('combobox', { name: 'Default timezone' });
    expect(select).toHaveTextContent('UTC+8 (default)');
    fireEvent.mouseDown(select);
    expect(
      screen.getByRole('option', { name: 'UTC+8 (default)' }),
    ).toBeTruthy();
    expect(screen.getByRole('option', { name: 'UTC+5:45' })).toBeTruthy();
    fireEvent.click(screen.getByRole('option', { name: 'UTC+5:45' }));
    expect(
      JSON.parse(localStorage.getItem(LOCAL_PREFS_KEY) ?? '{}').timezoneOffset,
    ).toBe(5.75);
    fireEvent.mouseDown(select);
    fireEvent.click(screen.getByRole('option', { name: /follow system/i }));
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
    const reset = screen.getByRole('button', { name: 'Restore all defaults' });
    fireEvent.click(reset);
    const dialog = screen.getByRole('alertdialog', {
      name: 'Restore all defaults?',
    });
    const cancel = within(dialog).getByRole('button', { name: 'Cancel' });
    expect(cancel).toHaveFocus();
    fireEvent.click(cancel);
    expect(
      JSON.parse(localStorage.getItem(LOCAL_PREFS_KEY) ?? '{}'),
    ).toMatchObject({
      theme: 'dark',
      timezoneOffset: -5,
    });

    fireEvent.click(reset);
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'Restore defaults',
      }),
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
