import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LocaleProvider } from '../../contexts/LocaleContext';
import { serviceWorkerUrl } from '../../global/buildInfo';
import PwaUpdatePrompt from './index';

const originalServiceWorker = Object.getOwnPropertyDescriptor(
  navigator,
  'serviceWorker',
);

interface ServiceWorkerMock extends EventTarget {
  postMessage: ReturnType<typeof vi.fn>;
  scriptURL: string;
  state: ServiceWorkerState;
}

function createWorker(
  scriptURL: string,
  state: ServiceWorkerState = 'activated',
): ServiceWorkerMock {
  return Object.assign(new EventTarget(), {
    postMessage: vi.fn(),
    scriptURL,
    state,
  });
}

function installServiceWorkerMock(register: ReturnType<typeof vi.fn>): void {
  const container = Object.assign(new EventTarget(), {
    controller: createWorker('http://localhost:3000/current-worker.js'),
    register,
  });
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: container,
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  if (originalServiceWorker) {
    Object.defineProperty(navigator, 'serviceWorker', originalServiceWorker);
  } else {
    Reflect.deleteProperty(navigator, 'serviceWorker');
  }
});

describe('<PwaUpdatePrompt />', () => {
  it('asks before installing and activating the latest worker', async () => {
    const latestVersion = '0.2.0-2026-09-02T08:00:00.000Z';
    const latestWorkerPath = '/sw-0-2-0-2026-09-02T08-00-00-000Z.js';
    const latestWorkerUrl = `http://localhost:3000${latestWorkerPath}`;
    const waitingWorker = createWorker(latestWorkerUrl, 'installed');
    const register = vi
      .fn()
      .mockResolvedValueOnce({ active: null, installing: null, waiting: null })
      .mockResolvedValueOnce({
        active: null,
        installing: null,
        waiting: waitingWorker,
      });
    installServiceWorkerMock(register);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          serviceWorker: latestWorkerPath,
          version: latestVersion,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        },
      ),
    );

    render(
      <LocaleProvider>
        <PwaUpdatePrompt />
      </LocaleProvider>,
    );

    expect(await screen.findByText('New version available.')).toBeVisible();
    expect(register).toHaveBeenCalledOnce();
    expect(register).toHaveBeenNthCalledWith(1, serviceWorkerUrl, {
      scope: '/',
      updateViaCache: 'none',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Update' }));

    await waitFor(() => {
      expect(register).toHaveBeenNthCalledWith(2, latestWorkerUrl, {
        scope: '/',
        updateViaCache: 'none',
      });
      expect(waitingWorker.postMessage).toHaveBeenCalledWith({
        type: 'SKIP_WAITING',
      });
    });
  });

  it('ignores an older waiter while the requested worker installs', async () => {
    const latestVersion = '0.2.0-2026-09-03T08:00:00.000Z';
    const latestWorkerPath = '/sw-0-2-0-2026-09-03T08-00-00-000Z.js';
    const latestWorkerUrl = `http://localhost:3000${latestWorkerPath}`;
    const olderWorker = createWorker(
      'http://localhost:3000/sw-0-2-0-older.js',
      'installed',
    );
    const installingWorker = createWorker(latestWorkerUrl, 'installing');
    const updateRegistration = {
      active: null,
      installing: installingWorker,
      waiting: olderWorker,
    };
    const register = vi
      .fn()
      .mockResolvedValueOnce({ active: null, installing: null, waiting: null })
      .mockResolvedValueOnce(updateRegistration);
    installServiceWorkerMock(register);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          serviceWorker: latestWorkerPath,
          version: latestVersion,
        }),
        { status: 200 },
      ),
    );

    render(
      <LocaleProvider>
        <PwaUpdatePrompt />
      </LocaleProvider>,
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Update' }));
    await waitFor(() => expect(register).toHaveBeenCalledTimes(2));

    installingWorker.state = 'installed';
    updateRegistration.waiting = installingWorker;
    installingWorker.dispatchEvent(new Event('statechange'));

    expect(olderWorker.postMessage).not.toHaveBeenCalled();
    expect(installingWorker.postMessage).toHaveBeenCalledWith({
      type: 'SKIP_WAITING',
    });
  });
});
