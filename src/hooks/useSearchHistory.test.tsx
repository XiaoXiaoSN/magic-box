import { fireEvent, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_HISTORY_INPUT_BYTES, useSearchHistory } from './useSearchHistory';

const STORAGE_KEY = 'mb_search_history';

const Probe = (): React.JSX.Element => {
  const { history, addEntry } = useSearchHistory();
  return (
    <>
      <output data-testid="count">{history.length}</output>
      <output data-testid="history">
        {history.map((item) => item.input).join('|')}
      </output>
      <button onClick={() => addEntry('new')} type="button">
        add
      </button>
      <button onClick={() => addEntry('newer')} type="button">
        add newer
      </button>
      <button
        onClick={() => addEntry('jwt\n::secret=top-secret')}
        type="button"
      >
        add secret
      </button>
    </>
  );
};

const BoundaryProbe = ({ input }: { input: string }): React.JSX.Element => {
  const { history, addEntry } = useSearchHistory();
  return (
    <>
      <output data-testid="count">{history.length}</output>
      <output data-testid="history">
        {history.map((item) => item.input).join('|')}
      </output>
      <button onClick={() => addEntry(input)} type="button">
        add boundary
      </button>
    </>
  );
};

describe('useSearchHistory persistence recovery', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('does not persist fallback state after a StrictMode mount read fails', () => {
    const stored = [{ id: 'old', timestamp: 1, input: 'old' }];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    const storage = window.localStorage;
    const originalGetItem = storage.getItem.bind(storage);
    const getItem = vi
      .spyOn(storage, 'getItem')
      .mockImplementationOnce(() => {
        throw new DOMException('blocked', 'SecurityError');
      })
      .mockImplementation(originalGetItem);

    try {
      render(
        <StrictMode>
          <Probe />
        </StrictMode>,
      );

      expect(screen.getByTestId('history')).toHaveTextContent('');
      expect(JSON.parse(originalGetItem(STORAGE_KEY) ?? '[]')).toEqual(stored);
    } finally {
      getItem.mockRestore();
    }
  });

  it('replays pending entries after repeated read failures', async () => {
    const stored = [{ id: 'old', timestamp: 1, input: 'old' }];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    const storage = window.localStorage;
    const originalGetItem = storage.getItem.bind(storage);
    let failures = 0;
    const getItem = vi.spyOn(storage, 'getItem').mockImplementation((key) => {
      if (key === STORAGE_KEY && failures < 2) {
        failures += 1;
        throw new DOMException('blocked', 'SecurityError');
      }
      return originalGetItem(key);
    });

    try {
      render(<Probe />);

      fireEvent.click(screen.getByRole('button', { name: 'add' }));
      expect(screen.getByTestId('history')).toHaveTextContent('new');
      expect(JSON.parse(originalGetItem(STORAGE_KEY) ?? '[]')).toEqual(stored);

      fireEvent.click(screen.getByRole('button', { name: 'add newer' }));

      await vi.waitFor(() => {
        expect(screen.getByTestId('history')).toHaveTextContent(
          'newer|new|old',
        );
        expect(
          JSON.parse(originalGetItem(STORAGE_KEY) ?? '[]').map(
            (item: { input: string }) => item.input,
          ),
        ).toEqual(['newer', 'new', 'old']);
      });
    } finally {
      getItem.mockRestore();
    }
  });

  it('does not keep private input in memory or storage', () => {
    render(<Probe />);

    fireEvent.click(screen.getByRole('button', { name: 'add secret' }));

    expect(screen.getByTestId('history')).toHaveTextContent('');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')).toEqual([]);
  });

  it('accepts an entry at 8 KiB and rejects a larger one before allocation', () => {
    const exact = 'x'.repeat(MAX_HISTORY_INPUT_BYTES);
    const { unmount } = render(<BoundaryProbe input={exact} />);
    fireEvent.click(screen.getByRole('button', { name: 'add boundary' }));

    expect(screen.getByTestId('count')).toHaveTextContent('1');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')[0].input).toBe(
      exact,
    );

    unmount();
    render(<BoundaryProbe input={`${exact}x`} />);
    fireEvent.click(screen.getByRole('button', { name: 'add boundary' }));

    expect(screen.getByTestId('count')).toHaveTextContent('1');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')).toHaveLength(
      1,
    );
  });

  it('measures CJK and emoji entries by UTF-8 bytes', () => {
    const cjk = '中'.repeat(2730);
    const cjkRender = render(<BoundaryProbe input={cjk} />);
    fireEvent.click(screen.getByRole('button', { name: 'add boundary' }));
    expect(screen.getByTestId('count')).toHaveTextContent('1');
    cjkRender.unmount();

    localStorage.clear();
    const emoji = '😀'.repeat(2048);
    const emojiRender = render(<BoundaryProbe input={emoji} />);
    fireEvent.click(screen.getByRole('button', { name: 'add boundary' }));
    expect(screen.getByTestId('count')).toHaveTextContent('1');
    emojiRender.unmount();

    localStorage.clear();
    render(<BoundaryProbe input={`${emoji}😀`} />);
    fireEvent.click(screen.getByRole('button', { name: 'add boundary' }));
    expect(screen.getByTestId('count')).toHaveTextContent('0');
  });

  it('filters oversized loaded entries and caps history at fifty items', () => {
    const entries = [
      { id: 'oversized', timestamp: 0, input: 'x'.repeat(8193) },
      ...Array.from({ length: 51 }, (_, index) => ({
        id: `item-${index}`,
        timestamp: index,
        input: `item-${index}`,
      })),
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));

    render(<Probe />);

    expect(screen.getByTestId('count')).toHaveTextContent('50');
    expect(screen.getByTestId('history')).not.toHaveTextContent('oversized');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')).toHaveLength(
      50,
    );
  });
});
