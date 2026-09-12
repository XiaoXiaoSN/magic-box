import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LocaleProvider } from '../../contexts/LocaleContext';
import { PreferencesProvider } from '../../contexts/PreferencesContext';
import { SettingsProvider } from '../../contexts/SettingsContext';
import ToolsListPage from './index';

const renderPage = () =>
  render(
    <LocaleProvider>
      <PreferencesProvider>
        <SettingsProvider>
          <MemoryRouter initialEntries={['/list']}>
            <ToolsListPage />
          </MemoryRouter>
        </SettingsProvider>
      </PreferencesProvider>
    </LocaleProvider>,
  );

beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
});

describe('/list exposes the Local AI box', () => {
  it('lists Local AI and renders a live, inert panel when it is selected', async () => {
    // The panel must not construct a worker just by being on screen.
    const worker = vi.fn();
    vi.stubGlobal('Worker', worker);
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /Local AI/ }));

    // `::ai` is the source's defaultInput, so selecting the row is enough for
    // the preview to mount the real box through MagicBox.
    expect(
      await screen.findByRole('heading', { name: 'Local AI' }),
    ).toBeInTheDocument();
    const panel = await screen.findByTestId(
      'local-ai-panel',
      {},
      { timeout: 3000 },
    );
    expect(panel).toBeInTheDocument();
    expect(screen.getByTestId('local-ai-status')).toHaveTextContent(
      'Not loaded',
    );
    expect(screen.getByTestId('local-ai-run')).toBeDisabled();
    expect(worker).not.toHaveBeenCalled();
  });

  it('keeps the box out of the way of every other tool in the list', async () => {
    renderPage();

    // Selecting a different tool must not leave the AI panel mounted.
    fireEvent.click(screen.getByRole('button', { name: /Local AI/ }));
    await screen.findByTestId('local-ai-panel', {}, { timeout: 3000 });
    fireEvent.click(screen.getByRole('button', { name: /Word Count/ }));
    await waitFor(() =>
      expect(screen.queryByTestId('local-ai-panel')).not.toBeInTheDocument(),
    );
  });
});
