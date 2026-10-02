import { LOCAL_PREFS_KEY } from '@functions/localPrefs';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../contexts/LocaleContext';
import { PreferencesProvider } from '../contexts/PreferencesContext';
import { SettingsProvider } from '../contexts/SettingsContext';
import SettingsPage from './SettingsPage';

vi.mock('../features/local-ai/LocalAIModelSettings', () => ({
  default: () => null,
}));

function mount() {
  return render(
    <LocaleProvider>
      <PreferencesProvider>
        <SettingsProvider>
          <SettingsPage />
        </SettingsProvider>
      </PreferencesProvider>
    </LocaleProvider>,
  );
}

describe('Settings timezone and defaults', () => {
  it('shows UTC+8 as default, saves fractional offsets, and follows the system', () => {
    mount();
    const select = screen.getByRole('combobox', { name: 'Default timezone' });
    expect(select).toHaveValue('8');
    expect(
      screen.getByRole('option', { name: 'UTC+8 (default)' }),
    ).toBeTruthy();
    fireEvent.change(select, { target: { value: '5.75' } });
    expect(
      JSON.parse(localStorage.getItem(LOCAL_PREFS_KEY) ?? '{}').timezoneOffset,
    ).toBe(5.75);
    fireEvent.change(select, { target: { value: 'system' } });
    expect(
      JSON.parse(localStorage.getItem(LOCAL_PREFS_KEY) ?? '{}').timezoneMode,
    ).toBe('system');
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
    expect(settings.boxes['Text Diff'].enabled).toBe(false);
    expect(settings.boxes.Now.enabled).toBe(true);
    expect(localStorage.getItem('history-marker')).toBe('keep');
  });
});
