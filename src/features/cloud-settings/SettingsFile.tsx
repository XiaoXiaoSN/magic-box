import { type ChangeEvent, useRef, useState } from 'react';
import { useLocale } from '../../contexts/LocaleContext';
import { usePreferences } from '../../contexts/PreferencesContext';
import { useSettings } from '../../contexts/SettingsContext';
import { downloadFile } from '../../functions/download';
import type { Translations } from '../../i18n';
import {
  type Config,
  decodePortableConfig,
  encodePortableConfig,
  portablePrefs,
} from './config';
import { applySettingsFile } from './fileSettings';

const MAX_SETTINGS_FILE_BYTES = 256 * 1024;
const preferenceLabels: Record<keyof Config['prefs'], keyof Translations> = {
  theme: 'settings.theme',
  density: 'settings.density',
  copyMode: 'portable.copyMode',
  timezoneOffset: 'portable.timezoneOffset',
  timezoneMode: 'settings.timezone',
  aiTask: 'settings.aiTask',
  aiLanguage: 'settings.aiLanguage',
  aiAutoCheck: 'settings.aiAutoCheck',
  aiAutoRun: 'settings.aiAutoRun',
};

export default function SettingsFile() {
  const { locale, t } = useLocale();
  const { prefs } = usePreferences();
  const { settings } = useSettings();
  const [pending, setPending] = useState<Config | null>(null);
  const [notice, setNotice] = useState<
    'portable.invalid' | 'portable.error' | 'portable.applied' | null
  >(null);
  const selection = useRef(0);
  const current = portablePrefs(prefs);

  const exportSettings = () => {
    const data = encodePortableConfig({ locale, prefs: current, settings });
    downloadFile(
      new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
      'magic-box-settings.json',
    );
  };

  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const request = ++selection.current;
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    setPending(null);
    setNotice(null);
    if (!file) return;
    try {
      if (file.size > MAX_SETTINGS_FILE_BYTES)
        throw new Error('Settings file too large');
      const next = decodePortableConfig(JSON.parse(await file.text()));
      if (selection.current === request) setPending(next);
    } catch {
      if (selection.current === request) setNotice('portable.invalid');
    }
  }

  function apply() {
    if (!pending) return;
    try {
      applySettingsFile(pending);
      setPending(null);
      setNotice('portable.applied');
    } catch {
      setNotice('portable.error');
    }
  }

  const changedPreferences = pending
    ? (Object.keys(preferenceLabels) as (keyof Config['prefs'])[]).filter(
        (key) => current[key] !== pending.prefs[key],
      )
    : [];
  const changedBoxes = pending
    ? Object.values(pending.settings.boxes).filter((box) => {
        const previous = settings.boxes[box.id];
        return (
          previous?.enabled !== box.enabled ||
          previous?.secondaryOrder !== box.secondaryOrder
        );
      }).length
    : 0;

  return (
    <>
      <div className="cloud-actions">
        <button className="btn-subtle" type="button" onClick={exportSettings}>
          {t('portable.export')}
        </button>
        <label>
          {t('portable.import')}{' '}
          <input
            accept=".json,application/json"
            onChange={(event) => void selectFile(event)}
            type="file"
          />
        </label>
      </div>
      {pending ? (
        <div>
          <p role="status">{t('portable.preview')}</p>
          <ul>
            {changedPreferences.map((key) => (
              <li key={key}>
                <strong>{t(preferenceLabels[key])}</strong>{' '}
                {String(current[key])} → {String(pending.prefs[key])}
              </li>
            ))}
            {pending.locale !== locale ? (
              <li>
                {t('portable.language', {
                  language: pending.locale === 'tw' ? '繁體中文' : 'English',
                })}
              </li>
            ) : null}
            <li>{t('portable.toolsChanged', { count: changedBoxes })}</li>
          </ul>
          <div className="cloud-actions">
            <button className="btn-subtle" type="button" onClick={apply}>
              {t('portable.apply')}
            </button>
            <button
              className="btn-subtle"
              type="button"
              onClick={() => {
                setPending(null);
                setNotice(null);
              }}
            >
              {t('portable.cancel')}
            </button>
          </div>
        </div>
      ) : null}
      {notice ? (
        <p role={notice === 'portable.applied' ? 'status' : 'alert'}>
          {t(notice)}
        </p>
      ) : null}
    </>
  );
}
