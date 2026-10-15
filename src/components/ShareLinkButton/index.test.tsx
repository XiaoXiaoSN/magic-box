import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LocaleProvider } from '../../contexts/LocaleContext';
import copyTextToClipboard from '../../functions/clipboard';
import ShareLinkButton from './index';

vi.mock('../../functions/clipboard', () => ({ default: vi.fn() }));

type Deferred<T> = {
  promise: Promise<T>;
  reject: (reason?: unknown) => void;
  resolve: (value: T) => void;
};

const deferred = <T,>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, reject, resolve };
};

const renderButton = () =>
  render(
    <LocaleProvider>
      <ShareLinkButton getShareLink={() => 'https://example.test/share'} />
    </LocaleProvider>,
  );

beforeEach(() => {
  vi.mocked(copyTextToClipboard).mockReset();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('<ShareLinkButton />', () => {
  it('does not show copied for a deferred failed copy', async () => {
    const copy = deferred<boolean>();
    vi.mocked(copyTextToClipboard).mockReturnValue(copy.promise);
    renderButton();

    const button = screen.getByRole('button', { name: 'Copy share link' });
    fireEvent.click(button);
    expect(button).toHaveAccessibleName('Copy share link');

    await act(async () => {
      copy.resolve(false);
      await copy.promise;
    });

    expect(button).toHaveAccessibleName('Copy share link');
  });

  it('does not show copied when copying rejects', async () => {
    vi.mocked(copyTextToClipboard).mockRejectedValue(new Error('denied'));
    renderButton();

    const button = screen.getByRole('button', { name: 'Copy share link' });
    fireEvent.click(button);
    await act(async () => {
      await Promise.resolve();
    });

    expect(button).toHaveAccessibleName('Copy share link');
  });

  it('restarts the copied duration and ignores an older completion', async () => {
    vi.useFakeTimers();
    const first = deferred<boolean>();
    const second = deferred<boolean>();
    vi.mocked(copyTextToClipboard)
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    renderButton();

    const button = screen.getByRole('button', { name: 'Copy share link' });
    fireEvent.click(button);
    fireEvent.click(button);

    await act(async () => {
      second.resolve(true);
      await second.promise;
    });
    expect(button).toHaveAccessibleName('Share link copied');

    await act(async () => {
      first.resolve(true);
      await first.promise;
    });
    act(() => {
      vi.advanceTimersByTime(1199);
    });
    expect(button).toHaveAccessibleName('Share link copied');
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(button).toHaveAccessibleName('Copy share link');
  });

  it('cleans up a copied timer when unmounted', async () => {
    vi.useFakeTimers();
    vi.mocked(copyTextToClipboard).mockResolvedValue(true);
    const { unmount } = renderButton();

    fireEvent.click(screen.getByRole('button', { name: 'Copy share link' }));
    await act(async () => {
      await Promise.resolve();
    });
    expect(vi.getTimerCount()).toBe(1);

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
