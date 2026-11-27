import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../../contexts/LocaleContext';
import {
  DEFAULT_PREFS,
  PreferencesProvider,
} from '../../contexts/PreferencesContext';
import {
  buildDefaultSettings,
  SettingsProvider,
} from '../../contexts/SettingsContext';
import CloudSettings from './CloudSettings';
import { decodeConfig, portablePrefs } from './config';

const user = { uid: 'user-a', email: 'a@example.com' };
const service = vi.hoisted(() => ({
  readBackup: vi.fn(),
  saveBackup: vi.fn(),
  signIn: vi.fn(),
}));
vi.mock('./account', () => ({
  ...service,
  account: {
    get currentUser() {
      return user;
    },
    onAuthStateChanged(callback: (value: typeof user) => void) {
      callback(user);
      return () => {};
    },
  },
}));

const backup = {
  revision: 2,
  config: {
    prefs: portablePrefs({ ...DEFAULT_PREFS, theme: 'dark' }),
    locale: 'en',
    settings: buildDefaultSettings(),
  },
};
function mount() {
  render(
    <LocaleProvider>
      <PreferencesProvider>
        <SettingsProvider>
          <CloudSettings />
        </SettingsProvider>
      </PreferencesProvider>
    </LocaleProvider>,
  );
}
beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  service.readBackup.mockResolvedValue(backup);
});

it('restores onto default settings only on request and keeps device-only data', async () => {
  localStorage.setItem(
    'mb_prefs',
    JSON.stringify({ collectFeedback: true, toolboxUrl: 'https://local.test' }),
  );
  localStorage.setItem('mb_search_history', 'private');
  mount();
  await screen.findByText(/device uses the defaults/);
  expect(service.saveBackup).not.toHaveBeenCalled();
  expect(localStorage.getItem('mb_prefs')).not.toContain('dark');
  fireEvent.click(screen.getByRole('button', { name: /Use cloud settings/ }));
  expect(
    await screen.findByText(/matches the last checked backup/),
  ).toBeVisible();
  expect(JSON.parse(localStorage.getItem('mb_prefs') ?? '{}')).toMatchObject({
    theme: 'dark',
    collectFeedback: true,
    toolboxUrl: 'https://local.test',
  });
  expect(localStorage.getItem('mb_search_history')).toBe('private');
});

it('requires a choice for customized browsers and a new decision after a concurrent save', async () => {
  localStorage.setItem('mb_prefs', JSON.stringify({ theme: 'light' }));
  mount();
  await screen.findByText(/different settings/);
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  fireEvent.click(screen.getByRole('button', { name: /Use cloud settings/ }));
  expect(localStorage.getItem('mb_prefs')).toContain('light');
  fireEvent.click(screen.getByRole('button', { name: /Replace cloud backup/ }));
  expect(service.saveBackup).not.toHaveBeenCalled();
  confirm.mockReturnValue(true);
  service.saveBackup.mockResolvedValue({
    conflict: true,
    backup: { ...backup, revision: 3 },
  });
  fireEvent.click(screen.getByRole('button', { name: /Replace cloud backup/ }));
  await screen.findByText(/Another device updated/);
  expect(service.saveBackup).toHaveBeenCalledTimes(1);
  expect(service.saveBackup.mock.calls[0][2]).toBe(2);
  expect(Object.keys(service.saveBackup.mock.calls[0][1].prefs)).toEqual(
    Object.keys(portablePrefs(DEFAULT_PREFS)),
  );
  await act(async () =>
    fireEvent.click(
      screen.getByRole('button', { name: /Replace cloud backup/ }),
    ),
  );
  expect(service.saveBackup.mock.calls[1][2]).toBe(3);
});

it('blocks writes until the account backup has been checked successfully', async () => {
  service.readBackup
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce(null);
  mount();
  await screen.findByText(/Could not access/);
  expect(screen.queryByRole('button', { name: /Save to cloud/ })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Check for changes' }));
  await screen.findByRole('button', { name: 'Save to cloud' });
  expect(service.saveBackup).not.toHaveBeenCalled();
});

it('rejects unsupported backups before applying local defaults', () => {
  const data = { ...backup.config, version: 1, revision: 2 };
  expect(decodeConfig(data)).toEqual(backup);
  expect(() => decodeConfig({ ...data, version: 2 })).toThrow();
  expect(() => decodeConfig({ ...data, prefs: {} })).toThrow();
});
