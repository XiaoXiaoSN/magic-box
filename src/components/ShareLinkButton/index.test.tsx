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

const renderButton = (options?: {
  copyKey?: string;
  onCopySuccess?: (copyKey: string | undefined) => void;
}) =>
  render(
    <LocaleProvider>
      <ShareLinkButton
        copyKey={options?.copyKey}
        getShareLink={() => 'https://example.test/share'}
        onCopySuccess={options?.onCopySuccess}
      />
    </LocaleProvider>,
  );

const renderDisabledButton = () =>
  render(
    <LocaleProvider>
      <ShareLinkButton
        disabled
        disabledLabel="Sharing is disabled for sensitive input"
        getShareLink={() => 'https://example.test/share'}
      />
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
  it('does not request a link while disabled', () => {
    vi.mocked(copyTextToClipboard).mockResolvedValue(true);
    renderDisabledButton();

    const button = screen.getByRole('button', {
      name: 'Sharing is disabled for sensitive input',
    });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(copyTextToClipboard).not.toHaveBeenCalled();
  });

  it('does not show copied for a deferred failed copy', async () => {
    const copy = deferred<boolean>();
    const onCopySuccess = vi.fn();
    vi.mocked(copyTextToClipboard).mockReturnValue(copy.promise);
    renderButton({ copyKey: 'input', onCopySuccess });

    const button = screen.getByRole('button', { name: 'Copy share link' });
    fireEvent.click(button);
    expect(button).toHaveAccessibleName('Copy share link');

    await act(async () => {
      copy.resolve(false);
      await copy.promise;
    });

    expect(button).toHaveAccessibleName('Copy share link');
    expect(onCopySuccess).not.toHaveBeenCalled();
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

  it('reports the key only after a current copy succeeds', async () => {
    const copy = deferred<boolean>();
    const onCopySuccess = vi.fn();
    const { rerender } = renderButton({
      copyKey: 'first',
      onCopySuccess,
    });

    vi.mocked(copyTextToClipboard).mockReturnValue(copy.promise);
    fireEvent.click(screen.getByRole('button', { name: 'Copy share link' }));
    rerender(
      <LocaleProvider>
        <ShareLinkButton
          copyKey="second"
          getShareLink={() => 'https://example.test/share'}
          onCopySuccess={onCopySuccess}
        />
      </LocaleProvider>,
    );

    await act(async () => {
      copy.resolve(true);
      await copy.promise;
    });
    expect(onCopySuccess).not.toHaveBeenCalled();

    vi.mocked(copyTextToClipboard).mockResolvedValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'Copy share link' }));
    await act(async () => {
      await Promise.resolve();
    });
    expect(onCopySuccess).toHaveBeenCalledWith('second');
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
