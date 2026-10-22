import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The privacy gate is document-sticky, so each case loads the page and its
// telemetry consumers from a fresh module graph.
const load = async (entry: string) => {
  vi.resetModules();
  const [privacy, runtimePrefs, page, locale, preferences, settings, router] =
    await Promise.all([
      import('@functions/localAIPrivacy'),
      import('@functions/runtimePrefs'),
      import('./index'),
      import('../../contexts/LocaleContext'),
      import('../../contexts/PreferencesContext'),
      import('../../contexts/SettingsContext'),
      import('react-router-dom'),
    ]);
  const ToolsListPage = page.default;
  const renderPage = () =>
    render(
      <locale.LocaleProvider>
        <preferences.PreferencesProvider>
          <settings.SettingsProvider>
            <router.MemoryRouter initialEntries={[entry]}>
              <ToolsListPage />
            </router.MemoryRouter>
          </settings.SettingsProvider>
        </preferences.PreferencesProvider>
      </locale.LocaleProvider>,
    );
  return { privacy, renderPage, runtimePrefs };
};

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
});

describe('/list preview privacy', () => {
  it('closes the sticky telemetry gate when a secret directive is typed', async () => {
    const { privacy, renderPage, runtimePrefs } = await load(
      '/list?box=JWT%20Decode',
    );
    expect(privacy.isLocalAIPrivate()).toBe(false);
    renderPage();
    expect(runtimePrefs.isAnalyticsEnabled()).toBe(true);

    const input = await screen.findByRole('combobox', { name: 'Input' });
    fireEvent.change(input, {
      target: { value: 'header.payload.signature\n::secret=top-secret' },
    });

    expect(screen.getByTestId('copy-tool-share-link')).toBeDisabled();
    expect(privacy.isLocalAIPrivate()).toBe(true);
    expect(runtimePrefs.isAnalyticsEnabled()).toBe(false);

    fireEvent.change(input, { target: { value: 'ordinary input' } });
    expect(runtimePrefs.isAnalyticsEnabled()).toBe(false);
  });

  it('keeps telemetry enabled when Local AI is only selected', async () => {
    const { privacy, renderPage, runtimePrefs } = await load(
      '/list?box=Word%20Count',
    );
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /Local AI/ }));
    await screen.findByTestId('local-ai-panel', {}, { timeout: 3000 });

    expect(screen.getByTestId('copy-tool-share-link')).toBeDisabled();
    expect(privacy.isLocalAIPrivate()).toBe(false);
    expect(runtimePrefs.isAnalyticsEnabled()).toBe(true);
  });
});
