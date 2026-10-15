import { fireEvent, render, screen } from '@testing-library/react';
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
    </>
  );
};

describe('useSearchHistory persistence recovery', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('preserves stored entries after a transient mount read failure', () => {
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
      render(<Probe />);

      expect(screen.getByTestId('history')).toHaveTextContent('');
      expect(JSON.parse(originalGetItem(STORAGE_KEY) ?? '[]')).toEqual(stored);

      fireEvent.click(screen.getByRole('button', { name: 'add' }));

      expect(screen.getByTestId('history')).toHaveTextContent('new|old');
      expect(
        JSON.parse(originalGetItem(STORAGE_KEY) ?? '[]').map(
          (item: { input: string }) => item.input,
        ),
      ).toEqual(['new', 'old']);
    } finally {
      getItem.mockRestore();
    }
  });
});
