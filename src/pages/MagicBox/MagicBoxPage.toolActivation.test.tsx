import copyTextToClipboard from '@functions/clipboard';
import { boxSources } from '@modules/boxSources';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import { InputDraftProvider } from '../../contexts/InputDraftContext';
import { LocaleProvider } from '../../contexts/LocaleContext';
import { PreferencesProvider } from '../../contexts/PreferencesContext';
import {
  buildDefaultSettings,
  SettingsProvider,
  SettingsStorage,
} from '../../contexts/SettingsContext';
import MagicBoxPage from './MagicBoxPage';

const { loadNormalize } = vi.hoisted(() => ({ loadNormalize: vi.fn() }));

vi.mock('@functions/clipboard', () => ({
  default: vi.fn().mockResolvedValue(true),
}));
vi.mock('@components/QRCodeReader', () => ({ default: () => null }));
vi.mock('@modules/boxSources/UnicodeNormalizeBoxSource', async (original) => {
  await loadNormalize();
  return original();
});

it('keeps one interactive Word Count when the directive enables a pending source above it', async () => {
  window.history.replaceState({}, '', '/');
  localStorage.clear();
  const settings = buildDefaultSettings();
  for (const source of boxSources) {
    const id = source.id ?? source.name;
    settings.boxes[id].enabled = id === 'word-count';
  }
  SettingsStorage.save(settings);
  let releaseLoad!: () => void;
  loadNormalize.mockReturnValue(
    new Promise<void>((resolve) => {
      releaseLoad = resolve;
    }),
  );

  render(
    <BrowserRouter>
      <LocaleProvider>
        <PreferencesProvider>
          <SettingsProvider>
            <InputDraftProvider>
              <MagicBoxPage />
            </InputDraftProvider>
          </SettingsProvider>
        </PreferencesProvider>
      </LocaleProvider>
    </BrowserRouter>,
  );

  try {
    fireEvent.change(screen.getByTestId('magic-input'), {
      target: { value: 'hello\n::normalize' },
    });
    const card = await screen.findByTestId('magic-box-result');
    expect(card).toHaveTextContent('Word Count');
    fireEvent.click(screen.getByRole('button', { name: 'Select Word Count' }));
    expect(card).toHaveClass('is-selected');

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Enable Unicode Normalize' }),
      );
    });
    expect(loadNormalize).toHaveBeenCalledOnce();
    expect(screen.getByTestId('magic-box-pending')).toBeInTheDocument();
    expect(screen.getAllByTestId('magic-box-result')).toEqual([card]);
    expect(card).not.toHaveClass('is-stale');
    expect(card).toHaveClass('is-selected');

    fireEvent.keyDown(window, { key: 'Enter' });
    expect(copyTextToClipboard).toHaveBeenCalledWith(
      'lines: 1\nwords: 1\ncharacters: 5',
    );

    releaseLoad();
    await waitFor(() => {
      expect(screen.queryByTestId('magic-box-pending')).not.toBeInTheDocument();
      expect(
        screen
          .getAllByTestId('magic-box-result-title')
          .map((title) => title.textContent),
      ).toEqual(['Unicode Normalize', 'Word Count']);
    });
    expect(screen.getAllByTestId('magic-box-result')[1]).toBe(card);
    expect(card).toHaveClass('is-selected');
  } finally {
    releaseLoad();
  }
});
