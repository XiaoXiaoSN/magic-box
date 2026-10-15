import { fireEvent, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSearchHistory } from './useSearchHistory';

const STORAGE_KEY = 'mb_search_history';

const Probe = (): React.JSX.Element => {
  const { history, addEntry } = useSearchHistory();
  return (
    <>
      <output data-testid="history">
        {history.map((item) => item.input).join('|')}
      </output>
      <button onClick={() => addEntry('new')} type="button">
        add
      </button>
      <button onClick={() => addEntry('newer')} type="button">
        add newer
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
});
