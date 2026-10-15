import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
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

interface ServiceWorkerContainerMock extends EventTarget {
  controller: ServiceWorkerMock | null;
  register: ReturnType<typeof vi.fn>;
}

interface ServiceWorkerRegistrationMock {
  active: ServiceWorkerMock | null;
  installing: ServiceWorkerMock | null;
  waiting: ServiceWorkerMock | null;
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

function installServiceWorkerMock(
  register: ReturnType<typeof vi.fn>,
  controller: ServiceWorkerMock | null = createWorker(
    'http://localhost:3000/current-worker.js',
  ),
): ServiceWorkerContainerMock {
  const container = Object.assign(new EventTarget(), {
    controller,
    register,
  });
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: container,
  });
  return container;
}

afterEach(() => {
  vi.useRealTimers();
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
    const serviceWorker = installServiceWorkerMock(register);
    const onReload = vi.fn();
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
        <PwaUpdatePrompt onReload={onReload} />
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

    waitingWorker.state = 'activated';
    waitingWorker.dispatchEvent(new Event('statechange'));
    expect(onReload).not.toHaveBeenCalled();

    serviceWorker.controller = waitingWorker;
    serviceWorker.dispatchEvent(new Event('controllerchange'));
    serviceWorker.dispatchEvent(new Event('controllerchange'));
    expect(onReload).toHaveBeenCalledOnce();
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
    const updateRegistration: ServiceWorkerRegistrationMock = {
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

  it('reloads an uncontrolled page when the requested worker activates', async () => {
    const latestVersion = '0.2.0-2026-09-04T08:00:00.000Z';
    const latestWorkerPath = '/sw-0-2-0-2026-09-04T08-00-00-000Z.js';
    const latestWorkerUrl = `http://localhost:3000${latestWorkerPath}`;
    const waitingWorker = createWorker(latestWorkerUrl, 'installed');
    const updateRegistration: ServiceWorkerRegistrationMock = {
      active: null,
      installing: null,
      waiting: waitingWorker,
    };
    const register = vi
      .fn()
      .mockResolvedValueOnce({ active: null, installing: null, waiting: null })
      .mockResolvedValueOnce(updateRegistration);
    const serviceWorker = installServiceWorkerMock(register, null);
    const onReload = vi.fn();
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
        <PwaUpdatePrompt onReload={onReload} />
      </LocaleProvider>,
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Update' }));
    await waitFor(() => {
      expect(waitingWorker.postMessage).toHaveBeenCalledWith({
        type: 'SKIP_WAITING',
      });
    });

    waitingWorker.state = 'activated';
    updateRegistration.active = waitingWorker;
    waitingWorker.dispatchEvent(new Event('statechange'));
    serviceWorker.dispatchEvent(new Event('controllerchange'));

    expect(onReload).toHaveBeenCalledOnce();
  });

  it('restores the update controls and manual refresh hint after a timeout', async () => {
    const latestWorkerPath = '/sw-0-2-0-2026-09-05T08-00-00-000Z.js';
    const waitingWorker = createWorker(
      `http://localhost:3000${latestWorkerPath}`,
      'installed',
    );
    const register = vi
      .fn()
      .mockResolvedValueOnce({ active: null, installing: null, waiting: null })
      .mockResolvedValueOnce({
        active: null,
        installing: null,
        waiting: waitingWorker,
      });
    const onReload = vi.fn();
    installServiceWorkerMock(register);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          serviceWorker: latestWorkerPath,
          version: '0.2.0-2026-09-05T08:00:00.000Z',
        }),
        { status: 200 },
      ),
    );

    render(
      <LocaleProvider>
        <PwaUpdatePrompt onReload={onReload} />
      </LocaleProvider>,
    );
    const updateButton = await screen.findByRole('button', { name: 'Update' });
    vi.useFakeTimers();
    await act(async () => {
      fireEvent.click(updateButton);
      await Promise.resolve();
    });
    expect(waitingWorker.postMessage).toHaveBeenCalledWith({
      type: 'SKIP_WAITING',
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(
      screen.getByText('Update did not finish. Refresh the page to continue.'),
    ).toBeVisible();
    expect(updateButton).toBeEnabled();
    expect(onReload).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('ignores a registration that resolves after timeout and dismissal', async () => {
    const latestWorkerPath = '/sw-0-2-0-2026-09-05T09-00-00-000Z.js';
    const waitingWorker = createWorker(
      `http://localhost:3000${latestWorkerPath}`,
      'installed',
    );
    let resolveRegistration: (
      registration: ServiceWorkerRegistrationMock,
    ) => void = () => {};
    const pendingRegistration = new Promise<ServiceWorkerRegistrationMock>(
      (resolve) => {
        resolveRegistration = resolve;
      },
    );
    const register = vi
      .fn()
      .mockResolvedValueOnce({ active: null, installing: null, waiting: null })
      .mockReturnValueOnce(pendingRegistration);
    const onReload = vi.fn();
    installServiceWorkerMock(register, null);
    const addEventListener = vi.spyOn(waitingWorker, 'addEventListener');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          serviceWorker: latestWorkerPath,
          version: '0.2.0-2026-09-05T09:00:00.000Z',
        }),
        { status: 200 },
      ),
    );

    render(
      <LocaleProvider>
        <PwaUpdatePrompt onReload={onReload} />
      </LocaleProvider>,
    );
    const updateButton = await screen.findByRole('button', { name: 'Update' });
    vi.useFakeTimers();
    fireEvent.click(updateButton);
    expect(register).toHaveBeenCalledTimes(2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(updateButton).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Later' }));

    await act(async () => {
      resolveRegistration({
        active: null,
        installing: null,
        waiting: waitingWorker,
      });
      await pendingRegistration;
    });

    expect(addEventListener).not.toHaveBeenCalled();
    expect(waitingWorker.postMessage).not.toHaveBeenCalled();
    waitingWorker.state = 'activated';
    waitingWorker.dispatchEvent(new Event('statechange'));
    expect(onReload).not.toHaveBeenCalled();
  });

  it('keeps a retry active when an earlier registration resolves late', async () => {
    const latestWorkerPath = '/sw-0-2-0-2026-09-05T10-00-00-000Z.js';
    const lateWorker = createWorker(
      `http://localhost:3000${latestWorkerPath}`,
      'installed',
    );
    const retryWorker = createWorker(
      `http://localhost:3000${latestWorkerPath}`,
      'installed',
    );
    let resolveRegistration: (
      registration: ServiceWorkerRegistrationMock,
    ) => void = () => {};
    const pendingRegistration = new Promise<ServiceWorkerRegistrationMock>(
      (resolve) => {
        resolveRegistration = resolve;
      },
    );
    const retryRegistration: ServiceWorkerRegistrationMock = {
      active: null,
      installing: null,
      waiting: retryWorker,
    };
    const register = vi
      .fn()
      .mockResolvedValueOnce({ active: null, installing: null, waiting: null })
      .mockReturnValueOnce(pendingRegistration)
      .mockResolvedValueOnce(retryRegistration);
    installServiceWorkerMock(register, null);
    const lateAddEventListener = vi.spyOn(lateWorker, 'addEventListener');
    const retryRemoveEventListener = vi.spyOn(
      retryWorker,
      'removeEventListener',
    );
    const onReload = vi.fn();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          serviceWorker: latestWorkerPath,
          version: '0.2.0-2026-09-05T10:00:00.000Z',
        }),
        { status: 200 },
      ),
    );

    render(
      <LocaleProvider>
        <PwaUpdatePrompt onReload={onReload} />
      </LocaleProvider>,
    );
    const updateButton = await screen.findByRole('button', { name: 'Update' });
    vi.useFakeTimers();
    fireEvent.click(updateButton);
    expect(register).toHaveBeenCalledTimes(2);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    await act(async () => {
      fireEvent.click(updateButton);
      await Promise.resolve();
    });
    expect(register).toHaveBeenCalledTimes(3);
    expect(retryWorker.postMessage).toHaveBeenCalledWith({
      type: 'SKIP_WAITING',
    });
    expect(vi.getTimerCount()).toBe(1);

    await act(async () => {
      resolveRegistration({
        active: null,
        installing: null,
        waiting: lateWorker,
      });
      await pendingRegistration;
    });

    expect(lateAddEventListener).not.toHaveBeenCalled();
    expect(lateWorker.postMessage).not.toHaveBeenCalled();
    expect(onReload).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(1);

    await act(async () => {
      retryWorker.state = 'redundant';
      retryWorker.dispatchEvent(new Event('statechange'));
    });
    expect(retryRemoveEventListener).toHaveBeenCalledWith(
      'statechange',
      expect.any(Function),
    );
    expect(vi.getTimerCount()).toBe(0);
    expect(updateButton).toBeEnabled();
    expect(onReload).not.toHaveBeenCalled();
  });

  it('cleans up the activation listener and timeout when unmounted', async () => {
    const latestWorkerPath = '/sw-0-2-0-2026-09-06T08-00-00-000Z.js';
    const waitingWorker = createWorker(
      `http://localhost:3000${latestWorkerPath}`,
      'installed',
    );
    const register = vi
      .fn()
      .mockResolvedValueOnce({ active: null, installing: null, waiting: null })
      .mockResolvedValueOnce({
        active: null,
        installing: null,
        waiting: waitingWorker,
      });
    const onReload = vi.fn();
    installServiceWorkerMock(register);
    const removeEventListener = vi.spyOn(waitingWorker, 'removeEventListener');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          serviceWorker: latestWorkerPath,
          version: '0.2.0-2026-09-06T08:00:00.000Z',
        }),
        { status: 200 },
      ),
    );

    const { unmount } = render(
      <LocaleProvider>
        <PwaUpdatePrompt onReload={onReload} />
      </LocaleProvider>,
    );
    const updateButton = await screen.findByRole('button', { name: 'Update' });
    vi.useFakeTimers();
    await act(async () => {
      fireEvent.click(updateButton);
      await Promise.resolve();
    });
    expect(vi.getTimerCount()).toBe(1);

    unmount();
    expect(removeEventListener).toHaveBeenCalledWith(
      'statechange',
      expect.any(Function),
    );
    expect(vi.getTimerCount()).toBe(0);
    waitingWorker.state = 'activated';
    waitingWorker.dispatchEvent(new Event('statechange'));
    expect(onReload).not.toHaveBeenCalled();
  });

  it('does not observe a worker that registers after unmount', async () => {
    const latestWorkerPath = '/sw-0-2-0-2026-09-08T08-00-00-000Z.js';
    const waitingWorker = createWorker(
      `http://localhost:3000${latestWorkerPath}`,
      'installed',
    );
    let resolveRegistration: (
      registration: ServiceWorkerRegistrationMock,
    ) => void = () => {};
    const pendingRegistration = new Promise<ServiceWorkerRegistrationMock>(
      (resolve) => {
        resolveRegistration = resolve;
      },
    );
    const register = vi
      .fn()
      .mockResolvedValueOnce({ active: null, installing: null, waiting: null })
      .mockReturnValueOnce(pendingRegistration);
    const onReload = vi.fn();
    installServiceWorkerMock(register);
    const addEventListener = vi.spyOn(waitingWorker, 'addEventListener');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          serviceWorker: latestWorkerPath,
          version: '0.2.0-2026-09-08T08:00:00.000Z',
        }),
        { status: 200 },
      ),
    );

    const { unmount } = render(
      <LocaleProvider>
        <PwaUpdatePrompt onReload={onReload} />
      </LocaleProvider>,
    );
    const updateButton = await screen.findByRole('button', { name: 'Update' });
    vi.useFakeTimers();
    fireEvent.click(updateButton);
    expect(register).toHaveBeenCalledTimes(2);
    unmount();

    await act(async () => {
      resolveRegistration({
        active: null,
        installing: null,
        waiting: waitingWorker,
      });
      await pendingRegistration;
    });

    expect(addEventListener).not.toHaveBeenCalled();
    expect(onReload).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('restores controls and removes listeners when an installing worker fails', async () => {
    const latestWorkerPath = '/sw-0-2-0-2026-09-07T08-00-00-000Z.js';
    const installingWorker = createWorker(
      `http://localhost:3000${latestWorkerPath}`,
      'installing',
    );
    const register = vi
      .fn()
      .mockResolvedValueOnce({ active: null, installing: null, waiting: null })
      .mockResolvedValueOnce({
        active: null,
        installing: installingWorker,
        waiting: null,
      });
    installServiceWorkerMock(register);
    const removeEventListener = vi.spyOn(
      installingWorker,
      'removeEventListener',
    );
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          serviceWorker: latestWorkerPath,
          version: '0.2.0-2026-09-07T08:00:00.000Z',
        }),
        { status: 200 },
      ),
    );

    render(
      <LocaleProvider>
        <PwaUpdatePrompt onReload={vi.fn()} />
      </LocaleProvider>,
    );
    const updateButton = await screen.findByRole('button', { name: 'Update' });
    vi.useFakeTimers();
    await act(async () => {
      fireEvent.click(updateButton);
      await Promise.resolve();
    });

    act(() => {
      installingWorker.state = 'redundant';
      installingWorker.dispatchEvent(new Event('statechange'));
    });

    expect(
      screen.getByText('Update did not finish. Refresh the page to continue.'),
    ).toBeVisible();
    expect(updateButton).toBeEnabled();
    expect(removeEventListener).toHaveBeenCalledWith(
      'statechange',
      expect.any(Function),
    );
    expect(vi.getTimerCount()).toBe(0);
  });
});
