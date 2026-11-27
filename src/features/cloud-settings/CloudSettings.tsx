import type { User } from 'firebase/auth';
import { useEffect, useMemo, useState } from 'react';
import { useLocale } from '../../contexts/LocaleContext';
import {
  DEFAULT_PREFS,
  usePreferences,
} from '../../contexts/PreferencesContext';
import {
  buildDefaultSettings,
  useSettings,
} from '../../contexts/SettingsContext';
import { DEFAULT_LOCALE } from '../../i18n';
import { account, readBackup, saveBackup, signIn } from './account';
import { portablePrefs, type SavedConfig } from './config';

const defaults = JSON.stringify({
  prefs: portablePrefs(DEFAULT_PREFS),
  locale: DEFAULT_LOCALE,
  settings: buildDefaultSettings(),
});

function BackupControls({
  uid,
  onRefresh,
}: {
  uid: string;
  onRefresh: () => void;
}) {
  const { t, locale, setLocale } = useLocale();
  const { prefs, updatePrefs } = usePreferences();
  const { settings, updateSettings } = useSettings();
  const config = useMemo(
    () => ({ prefs: portablePrefs(prefs), locale, settings }),
    [prefs, locale, settings],
  );
  const local = useMemo(() => JSON.stringify(config), [config]);
  const [remote, setRemote] = useState<SavedConfig | null>();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<'cloud.changed' | 'cloud.error' | null>(
    null,
  );

  useEffect(() => {
    let active = true;
    readBackup(uid)
      .then((result) => {
        if (active) setRemote(result);
      })
      .catch(() => {
        if (active) setNotice('cloud.error');
      });
    return () => {
      active = false;
    };
  }, [uid]);

  const same = remote && local === JSON.stringify(remote.config);
  const isDefault = local === defaults;
  async function save() {
    if (
      remote === undefined ||
      account.currentUser?.uid !== uid ||
      (remote && !window.confirm(t('cloud.confirmSave')))
    )
      return;
    setBusy(true);
    setNotice(null);
    try {
      const { backup, conflict } = await saveBackup(
        uid,
        config,
        remote?.revision ?? 0,
      );
      setRemote(backup);
      if (conflict) setNotice('cloud.changed');
    } catch {
      setNotice('cloud.error');
    } finally {
      setBusy(false);
    }
  }

  function restore() {
    if (
      !remote ||
      account.currentUser?.uid !== uid ||
      (!isDefault && !window.confirm(t('cloud.confirmRestore')))
    )
      return;
    updatePrefs(remote.config.prefs);
    setLocale(remote.config.locale);
    updateSettings(remote.config.settings);
    setNotice(null);
  }

  const status =
    remote === undefined
      ? 'cloud.loading'
      : remote === null
        ? 'cloud.empty'
        : same
          ? 'cloud.match'
          : isDefault
            ? 'cloud.fresh'
            : 'cloud.different';
  return (
    <>
      <p className="settings-section-sub" role="status">
        {t(notice ?? status)}
      </p>
      <div className="cloud-actions">
        {remote && !same && (
          <button
            className="btn-subtle"
            disabled={busy}
            onClick={restore}
            type="button"
          >
            {t('cloud.restore')}
          </button>
        )}
        {remote !== undefined && !same && (
          <button
            className="btn-subtle"
            disabled={busy}
            onClick={save}
            type="button"
          >
            {t(remote ? 'cloud.replace' : 'cloud.save')}
          </button>
        )}
        {(remote !== undefined || notice) && (
          <button
            className="btn-subtle"
            disabled={busy}
            onClick={onRefresh}
            type="button"
          >
            {t('cloud.refresh')}
          </button>
        )}
      </div>
    </>
  );
}

export default function CloudSettings(): React.JSX.Element {
  const { t } = useLocale();
  const [user, setUser] = useState<User | null>();
  const [refresh, setRefresh] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  useEffect(
    () =>
      account.onAuthStateChanged((next) => {
        setUser(next);
        setError(false);
      }),
    [],
  );

  async function changeAccount() {
    setPending(true);
    setError(false);
    try {
      if (user) await account.signOut();
      else await signIn();
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div className="cloud-actions">
        {user && <span>{user.email ?? user.displayName}</span>}
        <button
          className="btn-subtle"
          disabled={pending || user === undefined}
          onClick={changeAccount}
          type="button"
        >
          {t(
            user === undefined
              ? 'cloud.loading'
              : user
                ? 'cloud.signOut'
                : 'cloud.signIn',
          )}
        </button>
      </div>
      {error && <p role="alert">{t('cloud.authError')}</p>}
      {user && (
        <BackupControls
          key={`${user.uid}-${refresh}`}
          uid={user.uid}
          onRefresh={() => setRefresh((n) => n + 1)}
        />
      )}
    </>
  );
}
