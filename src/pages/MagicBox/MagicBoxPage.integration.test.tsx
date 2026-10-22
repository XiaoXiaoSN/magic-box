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
      const history = JSON.parse(
        localStorage.getItem('mb_search_history') ?? '[]',
      ) as Array<{ input: string }>;
      expect(history.map((item) => item.input)).toEqual(['payload']);
    });
  });
});
