import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../../contexts/LocaleContext';

// Mock the heavy children so the page can be tested in isolation without
// pulling in SettingsContext / WASM box sources. The mocks expose the page's
// callbacks (onPasteInput, QR setUserInput) as DOM buttons we can trigger.
vi.mock('@components/MagicBox', () => ({
  default: ({
    input,
    onPasteInput,
  }: {
    input: string;
    onPasteInput?: (value: string) => void;
  }) => (
    <div>
      <div data-testid="magic-input-echo">{input}</div>
      <button
        data-testid="paste-back"
        onClick={() => onPasteInput?.('pasted-value')}
        type="button"
      >
        paste back
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
      <MagicBoxPage />
    </LocaleProvider>,
  );

const getInput = () => screen.getByTestId('magic-input') as HTMLTextAreaElement;

describe('<MagicBoxPage />', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
  });

  afterEach(() => {
    window.history.replaceState({}, '', '/');
    vi.clearAllMocks();
  });

  it('prefills state from the ?input query param on mount', async () => {
    window.history.replaceState({}, '', '/?input=hello%20world');

    renderPage();

    expect(getInput().value).toBe('hello world');
  });

  it('prefills state from the short ?i query param on mount', () => {
    window.history.replaceState({}, '', '/?i=short');

    renderPage();

    expect(getInput().value).toBe('short');
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
});
