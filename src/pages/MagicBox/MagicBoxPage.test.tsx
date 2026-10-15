import { isLocalAIPrivate } from '@functions/localAIPrivacy';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InputDraftProvider } from '../../contexts/InputDraftContext';
import { LocaleProvider, useLocale } from '../../contexts/LocaleContext';

// Mock the heavy children so the page can be tested in isolation without
// pulling in SettingsContext / WASM box sources. The mocks expose the page's
// callbacks as DOM buttons we can trigger.
vi.mock('@components/MagicBox', () => ({
  default: ({
    input,
    onPasteInput,
    onInputCommit,
  }: {
    input: string;
    onPasteInput?: (value: string) => void;
    onInputCommit?: (value: string) => void;
  }) => (
    <div>
      <div data-testid="magic-input-echo">{input}</div>
      <button
        data-testid="paste-back"
        onClick={() => {
          onInputCommit?.(input);
          onPasteInput?.('pasted-value');
        }}
        type="button"
      >
        paste back
      </button>
      <button
        data-testid="copy-result"
        onClick={() => onInputCommit?.(input)}
        type="button"
      >
        copy
      </button>
    </div>
  ),
}));

vi.mock('@components/QRCodeReader', () => ({
  default: ({ setUserInput }: { setUserInput: (value: string) => void }) => (
    <button
      data-testid="qr-trigger"
      onClick={() => setUserInput('scanned-value')}
      type="button"
    >
      scan
    </button>
  ),
}));

import MagicBoxPage from './MagicBoxPage';

const renderPage = () =>
  render(
    <LocaleProvider>
      <InputDraftProvider>
        <MagicBoxPage />
      </InputDraftProvider>
    </LocaleProvider>,
  );

const LocaleSwitcher = () => {
  const { setLocale } = useLocale();
  return (
    <button onClick={() => setLocale('tw')} type="button">
      switch locale
    </button>
  );
};

const getInput = () => screen.getByTestId('magic-input') as HTMLTextAreaElement;

const HISTORY_KEY = 'mb_search_history';

const readHistory = (): { id: string; input: string; timestamp: number }[] =>
  JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]');

const typeInput = (value: string) => {
  fireEvent.change(getInput(), { target: { value } });
};

const blurInput = async () => {
  fireEvent.blur(getInput(), { relatedTarget: null });
  await act(async () => undefined);
};

describe('<MagicBoxPage />', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    window.history.replaceState({}, '', '/');
    vi.restoreAllMocks();
  });

  it('prefills state from the ?input query param on mount', () => {
    window.history.replaceState({}, '', '/?input=hello%20world');

    renderPage();

    expect(getInput().value).toBe('hello world');
  });

  it('prefills state from the short ?i query param on mount', () => {
    window.history.replaceState({}, '', '/?i=short');

    renderPage();

    expect(getInput().value).toBe('short');
  });

  it('uses an explicit empty query value instead of a restored draft', () => {
    sessionStorage.setItem(
      'mb_input_draft',
      JSON.stringify({ version: 1, input: 'restored draft' }),
    );
    window.history.replaceState({}, '', '/?input=');

    renderPage();

    expect(getInput().value).toBe('');
  });

  it('keeps the textarea controlled when typing', () => {
    renderPage();
    const input = getInput();

    fireEvent.change(input, { target: { value: 'typed text' } });

    expect(input.value).toBe('typed text');
  });

  it('updates state and caret when a QR scan result is applied', async () => {
    renderPage();

    await act(async () => {
      fireEvent.click(screen.getByTestId('qr-trigger'));
    });

    const input = getInput();
    expect(input.value).toBe('scanned-value');
    // caret should land at the end of the inserted text
    await waitFor(() => {
      expect(input.selectionStart).toBe('scanned-value'.length);
      expect(input.selectionEnd).toBe('scanned-value'.length);
    });
  });

  it('updates state and caret when output is pasted back into the input', async () => {
    window.history.replaceState({}, '', '/?input=source');
    renderPage();

    await act(async () => {
      fireEvent.click(screen.getByTestId('paste-back'));
    });

    const input = getInput();
    expect(input.value).toBe('pasted-value');
    await waitFor(() => {
      expect(input.selectionStart).toBe('pasted-value'.length);
      expect(input.selectionEnd).toBe('pasted-value'.length);
    });
    expect(readHistory().map((entry) => entry.input)).toEqual(['source']);
  });

  describe('search history', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('does not record input merely because typing pauses', async () => {
      renderPage();

      typeInput('hello world');
      await act(async () => {
        vi.advanceTimersByTime(600);
      });

      expect(readHistory()).toEqual([]);
    });

    it('records ordinary input when editing completes with blur', async () => {
      renderPage();

      typeInput('hello world');
      await blurInput();

      expect(readHistory().map((entry) => entry.input)).toEqual([
        'hello world',
      ]);
    });

    it('does not treat focus moving to a control as an input completion', async () => {
      renderPage();

      typeInput('hello world');
      fireEvent.blur(getInput(), {
        relatedTarget: screen.getByTestId('history-toggle'),
      });
      await act(async () => undefined);

      expect(readHistory()).toEqual([]);
    });

    it('records a successful result copy once and deduplicates repeats', async () => {
      renderPage();

      typeInput('hello world');
      await act(async () => {
        vi.advanceTimersByTime(600);
      });
      fireEvent.click(screen.getByTestId('copy-result'));
      fireEvent.click(screen.getByTestId('copy-result'));

      expect(readHistory().map((entry) => entry.input)).toEqual([
        'hello world',
      ]);
    });

    it('withdraws entries from the same edit session when ::ai is typed', async () => {
      renderPage();

      typeInput('my medical question');
      await blurInput();
      typeInput('my medical question\n::');
      await blurInput();
      expect(readHistory()).toHaveLength(2);

      typeInput('my medical question\n::ai');

      expect(readHistory()).toEqual([]);
      expect(isLocalAIPrivate()).toBe(true);
    });

    it('withdraws partial input before a secret directive and hides its value', async () => {
      renderPage();

      typeInput('jwt body');
      await blurInput();
      typeInput('jwt body\n::se');
      await blurInput();
      expect(readHistory()).toHaveLength(2);

      typeInput('jwt body\n::SECRET = top-secret');

      expect(readHistory()).toEqual([]);
      expect(screen.getByTestId('input-options')).toHaveTextContent('secret');
      expect(screen.getByTestId('input-options')).not.toHaveTextContent(
        'top-secret',
      );

      const shareButton = screen.getByTestId('copy-share-link');
      expect(shareButton).toBeDisabled();
      expect(shareButton).toHaveAccessibleName(
        'Sharing is disabled for sensitive input',
      );
    });

    it('masks local AI option values in chips and sharing', () => {
      renderPage();

      typeInput('private prompt\n::ai=hidden prompt');

      expect(screen.getByTestId('input-options')).toHaveTextContent('ai');
      expect(screen.getByTestId('input-options')).not.toHaveTextContent(
        'hidden prompt',
      );
      expect(screen.getByTestId('copy-share-link')).toBeDisabled();
    });

    it('keeps entries that existed before this edit session', async () => {
      localStorage.setItem(
        HISTORY_KEY,
        JSON.stringify([{ id: 'old', timestamp: 1, input: 'hello' }]),
      );
      renderPage();

      typeInput('hello');
      await blurInput();
      typeInput('');
      typeInput('base64 me');
      await blurInput();
      typeInput('');
      typeInput('say hi');
      await blurInput();
      typeInput('say hi\n::ai');

      // `hello` was only moved to the top, and `base64 me` belonged to an
      // earlier session; only the partial prompt goes.
      expect(readHistory().map((entry) => entry.input)).toEqual([
        'base64 me',
        'hello',
      ]);
    });

    it('drops malformed entries before rendering the history panel', () => {
      localStorage.setItem(
        HISTORY_KEY,
        JSON.stringify([
          { id: 'valid', timestamp: 1, input: 'valid input' },
          { id: 'missing-input', timestamp: 2 },
          { id: 3, timestamp: 3, input: 'bad id' },
          {
            id: 'bad-time',
            timestamp: Number.POSITIVE_INFINITY,
            input: 'bad time',
          },
          { id: 'bad-input', timestamp: 5, input: 5 },
        ]),
      );

      renderPage();
      fireEvent.click(screen.getByTestId('history-toggle'));

      expect(screen.getByText('valid input')).toBeInTheDocument();
      expect(screen.queryByText('bad id')).not.toBeInTheDocument();
      expect(screen.queryByText('bad time')).not.toBeInTheDocument();
      expect(screen.queryByText('missing-input')).not.toBeInTheDocument();
    });

    it('bounds history previews and titles without exposing the full input', () => {
      const longInput = '😀'.repeat(300);
      localStorage.setItem(
        HISTORY_KEY,
        JSON.stringify([{ id: 'long', timestamp: 1, input: longInput }]),
      );

      renderPage();
      fireEvent.click(screen.getByTestId('history-toggle'));

      const historyButton = screen
        .getByTestId('history-panel')
        .querySelector('button.history-item-btn') as HTMLButtonElement;
      expect(historyButton).toHaveAttribute('title');
      const title = historyButton.getAttribute('title') ?? '';
      expect(Array.from(title)).toHaveLength(256);
      expect(title.endsWith('…')).toBe(true);
      expect(title).not.toBe(longInput);
      expect(screen.getByText(title)).toBeInTheDocument();
    });

    it('keeps the history panel usable when storage reads fail', () => {
      const getItem = vi
        .spyOn(localStorage, 'getItem')
        .mockImplementation(() => {
          throw new DOMException('blocked', 'SecurityError');
        });

      renderPage();
      fireEvent.click(screen.getByTestId('history-toggle'));

      expect(screen.getByTestId('history-panel')).toBeInTheDocument();
      getItem.mockRestore();
    });

    it('keeps new entries in memory when storage writes fail', async () => {
      const setItem = vi
        .spyOn(localStorage, 'setItem')
        .mockImplementation(() => {
          throw new DOMException('full', 'QuotaExceededError');
        });

      renderPage();
      typeInput('memory only');
      await blurInput();
      fireEvent.click(screen.getByTestId('history-toggle'));

      expect(screen.getByTitle('memory only')).toBeInTheDocument();
      setItem.mockRestore();
    });

    it('uses a unique fallback id when randomUUID is unavailable', async () => {
      const descriptor = Object.getOwnPropertyDescriptor(crypto, 'randomUUID');
      Object.defineProperty(crypto, 'randomUUID', {
        configurable: true,
        value: undefined,
      });

      try {
        renderPage();
        typeInput('first');
        await blurInput();
        typeInput('second');
        await blurInput();

        const ids = readHistory().map((entry) => entry.id);
        expect(ids).toHaveLength(2);
        expect(new Set(ids).size).toBe(2);
        expect(ids.every((id) => id.length > 0)).toBe(true);
      } finally {
        if (descriptor) Object.defineProperty(crypto, 'randomUUID', descriptor);
      }
    });
  });

  it('does not write through the DOM ref directly (value driven by state)', () => {
    // typing flows through React state: the rendered value must reflect the
    // controlled `userInput`, proving the DOM value is not mutated out of band.
    renderPage();
    const input = getInput();

    fireEvent.change(input, { target: { value: 'abc' } });
    expect(input.value).toBe('abc');

    fireEvent.change(input, { target: { value: '' } });
    expect(input.value).toBe('');
  });

  it('formats history dates with the active app locale', () => {
    const timestamp = Date.UTC(2024, 0, 2, 12);
    localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify([{ id: 'old', timestamp, input: 'old input' }]),
    );
    render(
      <LocaleProvider>
        <LocaleSwitcher />
        <MagicBoxPage />
      </LocaleProvider>,
    );
    fireEvent.click(screen.getByTestId('history-toggle'));

    const englishDate = new Date(timestamp).toLocaleDateString('en');
    const taiwanDate = new Date(timestamp).toLocaleDateString('zh-TW');
    expect(screen.getByText(englishDate)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'switch locale' }));
    expect(screen.getByText(taiwanDate)).toBeInTheDocument();
    expect(englishDate).not.toBe(taiwanDate);
  });
});
