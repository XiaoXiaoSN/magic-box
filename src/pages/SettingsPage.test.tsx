import { LOCAL_PREFS_KEY } from '@functions/localPrefs';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../contexts/LocaleContext';
import { PreferencesProvider } from '../contexts/PreferencesContext';
import { SettingsProvider } from '../contexts/SettingsContext';
import { boxSources } from '../modules/boxSources';
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
  it('localizes source names and kinds without changing setting IDs', () => {
    localStorage.setItem(LOCAL_PREFS_KEY, JSON.stringify({ locale: 'tw' }));
    mount();

    expect(screen.getByText('顏色')).toBeInTheDocument();
    expect(
      screen.getAllByText('轉換', { selector: '.dnd-kind' }),
    ).not.toHaveLength(0);
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
  it('reorders and persists boxes through the keyboard sensor', async () => {
    mount();
    const grips = screen.getAllByRole('button', {
      name: /^Drag to reorder /,
    });
    const firstId = boxSources[0].id ?? boxSources[0].name;
    const secondId = boxSources[1].id ?? boxSources[1].name;
    const rows = Array.from(document.querySelectorAll<HTMLElement>('.dnd-row'));
    rows.forEach((row, index) => {
      vi.spyOn(row, 'getBoundingClientRect').mockReturnValue({
        bottom: (index + 1) * 40,
        height: 32,
        left: 0,
        right: 320,
        top: index * 40,
        width: 320,
        x: 0,
        y: index * 40,
        toJSON: () => ({}),
      } as DOMRect);
    });
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    });

    fireEvent.keyDown(grips[0], { code: 'Space', key: ' ' });
    await waitFor(() =>
      expect(grips[0]).toHaveAttribute('aria-pressed', 'true'),
    );
    fireEvent.keyDown(grips[0], { code: 'ArrowDown', key: 'ArrowDown' });
    fireEvent.keyDown(grips[0], { code: 'Space', key: ' ' });

    await waitFor(() => {
      const settings = JSON.parse(
        localStorage.getItem('mb_settings') ?? '{}',
      ) as { boxes: Record<string, { secondaryOrder: number }> };
      expect(settings.boxes[firstId].secondaryOrder).toBe(1);
      expect(settings.boxes[secondId].secondaryOrder).toBe(0);
    });
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

  it('restores each source default when resetting the box order', () => {
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
    fireEvent.click(screen.getByRole('button', { name: 'Reset to default' }));

    const settings = JSON.parse(
      localStorage.getItem('mb_settings') ?? '{}',
    ) as {
      boxes: Record<string, { enabled: boolean }>;
    };
    expect(
      Object.values(settings.boxes).filter((box) => box.enabled),
    ).toHaveLength(
      boxSources.filter((source) => !source.defaultDisabled).length,
    );
    for (const [index, source] of boxSources.entries()) {
      expect(settings.boxes[source.id ?? source.name]).toMatchObject({
        enabled: !source.defaultDisabled,
        secondaryOrder: index,
      });
    }
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
    expect(screen.getAllByRole('button', { name: /^Enable / })).toHaveLength(
      boxSources.filter((source) => source.defaultDisabled).length,
    );
    expect(screen.getAllByRole('button', { name: /^Disable / })).toHaveLength(
      boxSources.filter((source) => !source.defaultDisabled).length,
    );
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

    expect(screen.getAllByRole('button', { name: /^Disable / })).toHaveLength(
      boxSources.filter((source) => !source.defaultDisabled).length,
    );
    clearSpy.mockRestore();
    confirmSpy.mockRestore();
  });
});
