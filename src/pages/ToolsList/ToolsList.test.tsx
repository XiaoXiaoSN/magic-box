import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter, useNavigate, useSearchParams } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LocaleProvider } from '../../contexts/LocaleContext';
import { PreferencesProvider } from '../../contexts/PreferencesContext';
import { SettingsProvider } from '../../contexts/SettingsContext';
import WordCountBoxSource from '../../modules/boxSources/WordCountBoxSource';
import ToolsListPage from './index';

const RouterState = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  return (
    <>
      <output data-testid="router-box">{searchParams.get('box')}</output>
      <output data-testid="router-input">{searchParams.get('input')}</output>
      <button onClick={() => navigate(-1)} type="button">
        Back
      </button>
      <button onClick={() => navigate('/list')} type="button">
        Open list
      </button>
    </>
  );
};

const renderPage = (
  initialEntries: string[] = ['/list'],
  initialIndex = initialEntries.length - 1,
) =>
  render(
    <LocaleProvider>
      <PreferencesProvider>
        <SettingsProvider>
          <MemoryRouter
            initialEntries={initialEntries}
            initialIndex={initialIndex}
          >
            <RouterState />
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

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
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
    // Nothing is loaded, so the box offers setup rather than a run button.
    expect(screen.queryByTestId('local-ai-run')).not.toBeInTheDocument();
    expect(screen.getByTestId('local-ai-setup')).toBeInTheDocument();
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

describe('/list preview input state', () => {
  it('uses a matching shared input and clears it when switching tools', async () => {
    renderPage(['/list?box=Word%20Count&input=SHARED-INPUT']);

    expect(await screen.findByDisplayValue('SHARED-INPUT')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /UUID/ }));

    expect(await screen.findByDisplayValue('uuid')).toBeInTheDocument();
    expect(screen.getByTestId('router-box')).toHaveTextContent('UUID');
    expect(screen.getByTestId('router-input')).toHaveTextContent('');
  });

  it('hydrates a shared input after router back navigation', async () => {
    renderPage(
      ['/list?box=Word%20Count&input=SHARED-INPUT', '/list?box=UUID'],
      1,
    );

    expect(await screen.findByDisplayValue('uuid')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));

    expect(await screen.findByDisplayValue('SHARED-INPUT')).toBeInTheDocument();
  });

  it('updates shared input after same-tool router back navigation', async () => {
    renderPage(
      [
        '/list?box=Word%20Count&input=FIRST',
        '/list?box=Word%20Count&input=SECOND',
      ],
      1,
    );

    expect(await screen.findByDisplayValue('SECOND')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));

    expect(await screen.findByDisplayValue('FIRST')).toBeInTheDocument();
  });

  it('resets shared input when the same-tool route removes its input', async () => {
    renderPage(['/list?box=Word%20Count&input=SHARED-INPUT']);

    expect(await screen.findByDisplayValue('SHARED-INPUT')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open list' }));

    const input = await screen.findByRole('textbox', { name: '' });
    expect(input).toHaveValue(WordCountBoxSource.defaultInput);
  });

  it('runs the selected source once after input settles', async () => {
    vi.useFakeTimers();
    const generateBoxes = vi.spyOn(WordCountBoxSource, 'generateBoxes');
    renderPage(['/list?box=Word%20Count']);

    const input = screen.getByRole('textbox', { name: '' });
    fireEvent.change(input, { target: { value: 'a' } });
    await act(async () => {
      vi.advanceTimersByTime(100);
    });
    fireEvent.change(input, { target: { value: 'ab' } });
    await act(async () => {
      vi.advanceTimersByTime(399);
    });

    expect(generateBoxes).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1);
    });

    expect(generateBoxes).toHaveBeenCalledTimes(1);
    expect(generateBoxes).toHaveBeenCalledWith('ab', {});
  });

  it('renders and remains interactive when storage access is blocked', () => {
    const descriptor = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('blocked', 'SecurityError');
      },
    });

    try {
      renderPage(['/list?box=Word%20Count']);

      expect(
        screen.getByRole('heading', { name: 'Word Count' }),
      ).toBeInTheDocument();
    } finally {
      if (descriptor) Object.defineProperty(window, 'localStorage', descriptor);
    }
  });

  it('preserves stored list state after a transient mount read failure', () => {
    localStorage.setItem('mb:list:collapsed', '1');
    localStorage.setItem('mb:list:selected', 'Word Count');
    const storage = window.localStorage;
    const originalGetItem = storage.getItem.bind(storage);
    let failed = false;
    const getItem = vi.spyOn(storage, 'getItem').mockImplementation((key) => {
      if (key === 'mb:list:collapsed' && !failed) {
        failed = true;
        throw new DOMException('blocked', 'SecurityError');
      }
      return originalGetItem(key);
    });

    try {
      renderPage(['/list']);

      expect(document.querySelector('.list-page')).toHaveAttribute(
        'data-sidebar-collapsed',
        'false',
      );
      expect(originalGetItem('mb:list:collapsed')).toBe('1');
      expect(originalGetItem('mb:list:selected')).toBe('Word Count');

      fireEvent.click(
        screen.getByRole('button', { name: /collapse sidebar/i }),
      );

      expect(originalGetItem('mb:list:collapsed')).toBe('1');
      fireEvent.click(screen.getByRole('button', { name: /UUID/ }));

      expect(originalGetItem('mb:list:selected')).toBe('UUID');
    } finally {
      getItem.mockRestore();
    }
  });

  it('keeps sidebar state interactive when storage writes fail', () => {
    const setItem = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });

    renderPage(['/list?box=Word%20Count']);
    fireEvent.click(screen.getByRole('button', { name: /collapse sidebar/i }));

    expect(document.querySelector('.list-page')).toHaveAttribute(
      'data-sidebar-collapsed',
      'true',
    );
    setItem.mockRestore();
  });
});
