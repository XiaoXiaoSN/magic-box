import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { StrictMode } from 'react';
import { MemoryRouter, useNavigate, useSearchParams } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LocaleProvider } from '../../contexts/LocaleContext';
import { PreferencesProvider } from '../../contexts/PreferencesContext';
import { SettingsProvider } from '../../contexts/SettingsContext';
import { LOCAL_PREFS_KEY } from '../../functions/localPrefs';
import { buildShareLink } from '../../functions/shareLink';
import WordCountBoxSource from '../../modules/boxSources/WordCountBoxSource';
import BoxesPage from './index';

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
      <button onClick={() => navigate('/boxes')} type="button">
        Open list
      </button>
    </>
  );
};

const renderPage = (
  initialEntries: string[] = ['/boxes'],
  initialIndex = initialEntries.length - 1,
  strictMode = false,
) => {
  const content = (
    <LocaleProvider>
      <PreferencesProvider>
        <SettingsProvider>
          <MemoryRouter
            initialEntries={initialEntries}
            initialIndex={initialIndex}
          >
            <RouterState />
            <BoxesPage />
          </MemoryRouter>
        </SettingsProvider>
      </PreferencesProvider>
    </LocaleProvider>
  );

  return render(strictMode ? <StrictMode>{content}</StrictMode> : content);
};

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

describe('/boxes exposes the Local AI box', () => {
  it('lists Local AI and renders a live, inert panel when it is selected', async () => {
    // The panel must not construct a worker just by being on screen.
    const worker = vi.fn();
    vi.stubGlobal('Worker', worker);
    renderPage();

    fireEvent.click(
      screen.getByText('Local AI', { selector: '.box-library-name strong' }),
    );

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
    fireEvent.click(
      screen.getByText('Local AI', { selector: '.box-library-name strong' }),
    );
    await screen.findByTestId('local-ai-panel', {}, { timeout: 3000 });
    fireEvent.click(
      screen.getByText('Word Count', { selector: '.box-library-name strong' }),
    );
    await waitFor(() =>
      expect(screen.queryByTestId('local-ai-panel')).not.toBeInTheDocument(),
    );
  });
});

describe('/boxes preview input state', () => {
  it('localizes source metadata and searches localized names', async () => {
    localStorage.setItem(LOCAL_PREFS_KEY, JSON.stringify({ locale: 'tw' }));
    renderPage(['/boxes?box=Word%20Count']);

    expect(
      await screen.findByRole('heading', { name: '字數統計' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('分析', { selector: '.preview-kind' }),
    ).toBeInTheDocument();

    const search = screen.getByRole('textbox', { name: '搜尋 Box' });
    fireEvent.change(search, { target: { value: '字數' } });
    expect(
      screen.getByRole('button', { name: '字數統計' }),
    ).toBeInTheDocument();
  });

  it('keeps a shared empty preview empty and uses the default when omitted', async () => {
    const empty = new URL(
      buildShareLink({ box: 'word-count', input: '', pathname: '/boxes' }),
    );
    const first = renderPage([`${empty.pathname}${empty.search}`]);
    expect(await screen.findByRole('combobox', { name: 'Input' })).toHaveValue(
      '',
    );

    first.unmount();
    const omitted = new URL(
      buildShareLink({ box: 'word-count', pathname: '/boxes' }),
    );
    renderPage([`${omitted.pathname}${omitted.search}`]);
    expect(await screen.findByRole('combobox', { name: 'Input' })).toHaveValue(
      WordCountBoxSource.defaultInput,
    );
  });

  it('uses a matching shared input and clears it when switching tools', async () => {
    renderPage(['/boxes?box=Word%20Count&input=SHARED-INPUT']);

    expect(await screen.findByDisplayValue('SHARED-INPUT')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'UUID' }));

    expect(await screen.findByDisplayValue('uuid')).toBeInTheDocument();
    expect(screen.getByTestId('router-box')).toHaveTextContent('uuid');
    expect(screen.getByTestId('router-input')).toHaveTextContent('');
  });

  it('hydrates a shared input after router back navigation', async () => {
    renderPage(
      ['/boxes?box=Word%20Count&input=SHARED-INPUT', '/boxes?box=UUID'],
      1,
    );

    expect(await screen.findByDisplayValue('uuid')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));

    expect(await screen.findByDisplayValue('SHARED-INPUT')).toBeInTheDocument();
  });

  it('updates shared input after same-tool router back navigation', async () => {
    renderPage(
      [
        '/boxes?box=Word%20Count&input=FIRST',
        '/boxes?box=Word%20Count&input=SECOND',
      ],
      1,
    );

    expect(await screen.findByDisplayValue('SECOND')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));

    expect(await screen.findByDisplayValue('FIRST')).toBeInTheDocument();
  });

  it('resets shared input when the same-tool route removes its input', async () => {
    renderPage(['/boxes?box=Word%20Count&input=SHARED-INPUT']);

    expect(await screen.findByDisplayValue('SHARED-INPUT')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open list' }));

    const input = await screen.findByRole('combobox', { name: 'Input' });
    expect(input).toHaveValue(WordCountBoxSource.defaultInput);
  });

  it('runs the selected source once after input settles', async () => {
    vi.useFakeTimers();
    const generateBoxes = vi.spyOn(WordCountBoxSource, 'generateBoxes');
    renderPage(['/boxes?box=Word%20Count']);

    const input = screen.getByRole('combobox', { name: 'Input' });
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
    expect(generateBoxes).toHaveBeenCalledWith(
      'ab',
      {},
      expect.objectContaining({
        preview: true,
        signal: expect.any(AbortSignal),
      }),
    );
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
      renderPage(['/boxes?box=Word%20Count']);

      expect(
        screen.getByRole('heading', { name: 'Word Count' }),
      ).toBeInTheDocument();
    } finally {
      if (descriptor) Object.defineProperty(window, 'localStorage', descriptor);
    }
  });

  it('preserves stored list state when StrictMode mount reads fail', () => {
    localStorage.setItem('mb:list:selected', 'Word Count');
    const storage = window.localStorage;
    const originalGetItem = storage.getItem.bind(storage);
    const getItem = vi.spyOn(storage, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });

    try {
      renderPage(['/boxes'], 0, true);

      expect(originalGetItem('mb:list:selected')).toBe('Word Count');
      fireEvent.click(screen.getByRole('button', { name: 'UUID' }));

      expect(originalGetItem('mb:list:selected')).toBe('uuid');
    } finally {
      getItem.mockRestore();
    }
  });

  it('keeps selection interactive when storage writes fail', () => {
    const setItem = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });

    renderPage(['/boxes?box=Word%20Count']);
    fireEvent.click(screen.getByRole('button', { name: 'UUID' }));
    expect(screen.getByTestId('router-box')).toHaveTextContent('uuid');
    expect(screen.getByRole('heading', { name: 'UUID' })).toBeInTheDocument();
    setItem.mockRestore();
  });
});
