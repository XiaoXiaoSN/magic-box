import { BoxBuilder, type BoxView } from '@modules/Box';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import BoxCard from './components/MagicBox/BoxCard';
import { LocaleProvider } from './contexts/LocaleContext';

const { loadQRCode, loadHighlighter, loadSettings } = vi.hoisted(() => ({
  loadQRCode: vi.fn().mockRejectedValueOnce(new TypeError('offline')),
  loadHighlighter: vi.fn().mockRejectedValueOnce(new TypeError('offline')),
  loadSettings: vi.fn().mockRejectedValueOnce(new TypeError('offline')),
}));

// Fail a dynamic import once and delegate to the real module on retry.
vi.mock(
  './components/BoxTemplate/QRCodeBoxTemplate',
  async (importOriginal) => {
    await loadQRCode();
    return importOriginal();
  },
);
vi.mock('react-syntax-highlighter/dist/esm/light', async (importOriginal) => {
  await loadHighlighter();
  return importOriginal();
});
vi.mock('@pages/SettingsPage', async (importOriginal) => {
  await loadSettings();
  return importOriginal();
});
// The QR template still renders its real child hierarchy. Use the SVG
// renderer in jsdom, where a canvas context is unavailable.
vi.mock('qrcode.react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('qrcode.react')>();
  return { ...actual, QRCodeCanvas: actual.QRCodeSVG };
});

function renderCard(view: BoxView, output: string) {
  const box = new BoxBuilder('Sample', output)
    .setView(view)
    .setOptions({ language: 'json' })
    .build();
  render(
    <LocaleProvider>
      <BoxCard
        box={box}
        index={0}
        onCopy={async () => true}
        onSelect={() => {}}
        resultId={Symbol()}
        selected={false}
        selectionTabIndex={0}
        stale={false}
      />
    </LocaleProvider>,
  );
}

describe('lazy chunk recovery', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    window.history.replaceState(null, '', '/');
  });
  afterEach(() => {
    vi.restoreAllMocks();
    window.history.replaceState(null, '', '/');
    window.sessionStorage.clear();
  });

  it('retries the QR template loader after its initial rejection', async () => {
    renderCard('qrCode', 'https://example.com');
    const fallback = await screen.findByTestId(
      'box-template-error',
      {},
      { timeout: 5000 },
    );
    expect(loadQRCode).toHaveBeenCalledTimes(1);
    expect(
      within(fallback).getByRole('button', { name: 'Reload page' }),
    ).toBeInTheDocument();

    fireEvent.click(
      within(fallback).getByRole('button', { name: 'Try again' }),
    );

    const output = await screen.findByTestId('magic-box-result-text');
    expect(output.querySelector('svg')).toBeInTheDocument();
    expect(loadQRCode).toHaveBeenCalledTimes(2);
    expect(fallback).not.toBeInTheDocument();
  });

  it('retries the nested syntax-highlighter import', async () => {
    const json = '{"key":1}';
    renderCard('code', json);
    const fallback = await screen.findByTestId(
      'box-template-error',
      {},
      { timeout: 5000 },
    );
    expect(loadHighlighter).toHaveBeenCalledTimes(1);

    fireEvent.click(
      within(fallback).getByRole('button', { name: 'Try again' }),
    );

    const output = await screen.findByTestId('magic-box-result-text');
    expect(output.querySelector('code')).toHaveClass('language-json');
    expect(output).toHaveTextContent(json);
    expect(loadHighlighter).toHaveBeenCalledTimes(2);
  });

  it('retries the feature-route import without losing the shell or input draft', async () => {
    render(<App />);
    const input = await screen.findByTestId('magic-input');
    const draft = 'keep this draft across the failed route';
    fireEvent.change(input, { target: { value: draft } });
    const header = screen.getByTestId('header');
    fireEvent.click(within(header).getByRole('link', { name: 'Settings' }));

    const fallback = await screen.findByTestId(
      'app-error',
      {},
      { timeout: 5000 },
    );
    expect(loadSettings).toHaveBeenCalledTimes(1);
    expect(header).toBeInTheDocument();
    fireEvent.click(
      within(fallback).getByRole('button', { name: 'Try again' }),
    );

    expect(
      await screen.findByRole('heading', { name: 'Settings' }),
    ).toBeInTheDocument();
    expect(loadSettings).toHaveBeenCalledTimes(2);
    expect(window.location.pathname).toBe('/settings');
    fireEvent.click(within(header).getByRole('link', { name: /Magic Box/ }));
    expect(await screen.findByTestId('magic-input')).toHaveValue(draft);
  });
});
