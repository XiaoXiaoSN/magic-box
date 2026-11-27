import copyTextToClipboard from '@functions/clipboard';
import { BoxBuilder } from '@modules/Box';
import type { BoxSource } from '@modules/BoxSource';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InputDraftProvider } from '../../contexts/InputDraftContext';
import { LocaleProvider } from '../../contexts/LocaleContext';
import { PreferencesProvider } from '../../contexts/PreferencesContext';
import { SettingsProvider } from '../../contexts/SettingsContext';
import type { HistoryItem } from '../../hooks/useSearchHistory';

const { controlledSource, generateBoxes } = vi.hoisted(() => {
  const generateBoxes = vi.fn();
  const controlledSource: BoxSource = {
    id: 'controlled',
    name: 'Controlled',
    description: 'A source used by the page integration contract.',
    defaultInput: 'controlled',
    tag: '·',
    kind: 'Test',
    generateBoxes,
  };
  return { controlledSource, generateBoxes };
});

vi.mock('@functions/clipboard', () => ({ default: vi.fn() }));
vi.mock('@modules/boxSources', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@modules/boxSources')>();
  return { ...actual, boxSources: [controlledSource] };
});
vi.mock('@components/QRCodeReader', () => ({ default: () => null }));

import MagicBoxPage from './MagicBoxPage';

const HISTORY_KEY = 'mb_search_history';
const readHistory = () =>
  JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') as HistoryItem[];

const renderPage = () =>
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

describe('<MagicBoxPage /> with the real MagicBox pipeline', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
    localStorage.clear();
    vi.useFakeTimers();
    generateBoxes.mockReset();
    generateBoxes.mockImplementation(async (input: string) => [
      new BoxBuilder('Controlled', input).setShowExpandButton(false).build(),
    ]);
    vi.mocked(copyTextToClipboard).mockReset().mockResolvedValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces live input, renders the real result, and commits Enter through the page', async () => {
    renderPage();
    const input = screen.getByTestId('magic-input');

    fireEvent.change(input, { target: { value: 'payload' } });
    expect(generateBoxes).not.toHaveBeenCalled();
    expect(screen.queryByTestId('magic-box-result')).not.toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(500);
      await Promise.resolve();
      await Promise.resolve();
    });
    vi.useRealTimers();

    await waitFor(() => {
      expect(generateBoxes).toHaveBeenCalledWith(
        'payload',
        {},
        expect.objectContaining({
          preview: false,
          signal: expect.any(AbortSignal),
        }),
      );
    });
    expect(await screen.findByTestId('magic-box-result')).toHaveTextContent(
      'payload',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Select Controlled' }));
    fireEvent.keyDown(window, { key: 'Enter' });

    await waitFor(() =>
      expect(copyTextToClipboard).toHaveBeenCalledWith('payload'),
    );
    await waitFor(() => {
      expect(readHistory().map((item) => item.input)).toEqual(['payload']);
    });
  });

  it.each([
    {
      copyVia: 'result',
      deleteWith: 'Delete history entry: payload',
      survivingInputs: ['older input'],
    },
    {
      copyVia: 'share link',
      deleteWith: 'Clear history',
      survivingInputs: [],
    },
  ])('restores history on $copyVia copy after $deleteWith', async ({
    copyVia,
    deleteWith,
    survivingInputs,
  }) => {
    localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify([{ id: 'older', timestamp: 1, input: 'older input' }]),
    );

    renderPage();
    const input = screen.getByTestId('magic-input');
    fireEvent.change(input, { target: { value: 'payload' } });
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    expect(readHistory().map((entry) => entry.input)).toEqual(['older input']);

    const copyButton =
      copyVia === 'result'
        ? screen.getByRole('button', { name: 'Copy Controlled output' })
        : screen.getByTestId('copy-share-link');
    const copy = () =>
      act(async () => {
        fireEvent.click(copyButton);
      });
    await copy();
    const initialHistory = readHistory();
    expect(initialHistory.map((entry) => entry.input)).toEqual([
      'payload',
      'older input',
    ]);
    await copy();
    expect(readHistory()).toEqual(initialHistory);

    fireEvent.click(screen.getByTestId('history-toggle'));
    fireEvent.click(screen.getByRole('button', { name: deleteWith }));
    expect(readHistory().map((entry) => entry.input)).toEqual(survivingInputs);
    expect(input).toHaveValue('payload');

    await copy();
    const restoredHistory = readHistory();
    expect(restoredHistory.map((entry) => entry.input)).toEqual([
      'payload',
      ...survivingInputs,
    ]);
    expect(restoredHistory[0].id).not.toBe(initialHistory[0].id);
    await copy();
    expect(readHistory()).toEqual(restoredHistory);
    expect(copyTextToClipboard).toHaveBeenCalledTimes(4);
  });
});
