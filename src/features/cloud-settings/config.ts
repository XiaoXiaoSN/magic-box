import { normalizePrefs, type Prefs } from '../../contexts/PreferencesContext';
import {
  normalizeSettings,
  SETTINGS_VERSION,
  type Settings,
} from '../../contexts/SettingsContext';
import { isLocale, type Locale } from '../../i18n';

type PortablePrefs = Pick<
  Prefs,
  | 'theme'
  | 'density'
  | 'copyMode'
  | 'timezoneOffset'
  | 'timezoneMode'
  | 'aiTask'
  | 'aiLanguage'
  | 'aiAutoCheck'
  | 'aiAutoRun'
>;

// This allowlist keeps consent, backend URLs and future device-only preferences local.
export function portablePrefs(prefs: Prefs): PortablePrefs {
  return {
    theme: prefs.theme,
    density: prefs.density,
    copyMode: prefs.copyMode,
    timezoneOffset: prefs.timezoneOffset,
    timezoneMode: prefs.timezoneMode,
    aiTask: prefs.aiTask,
    aiLanguage: prefs.aiLanguage,
    aiAutoCheck: prefs.aiAutoCheck,
    aiAutoRun: prefs.aiAutoRun,
  };
}

export interface Config {
  prefs: PortablePrefs;
  locale: Locale;
  settings: Settings;
}

export interface SavedConfig {
  config: Config;
  revision: number;
}

function isMap(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function decodeConfig(data: Record<string, unknown>): SavedConfig {
  const { revision, prefs, settings, locale } = data;
  if (
    data.version !== 1 ||
    typeof revision !== 'number' ||
    !Number.isSafeInteger(revision) ||
    revision < 1 ||
    !isLocale(locale) ||
    !isMap(prefs) ||
    !isMap(settings) ||
    settings.version !== SETTINGS_VERSION ||
    !isMap(settings.boxes)
  ) {
    throw new Error('Unsupported settings backup');
  }
  const normalized = portablePrefs(normalizePrefs(prefs));
  if (
    Object.entries(normalized).some(([key, value]) => value !== prefs[key]) ||
    Object.values(settings.boxes).some(
      (box) =>
        !isMap(box) ||
        typeof box.enabled !== 'boolean' ||
        !Number.isSafeInteger(box.secondaryOrder),
    )
  ) {
    throw new Error('Invalid settings backup');
  }
  return {
    revision,
    config: {
      prefs: normalized,
      locale,
      settings: normalizeSettings(settings),
    },
  };
}
