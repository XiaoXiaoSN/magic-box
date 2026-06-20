import { patchLocalPrefs, readLocalPrefs } from '@functions/localPrefs';
import { setRuntimePrefs } from '@functions/runtimePrefs';
import {
  DEFAULT_TIMEZONE_OFFSET,
  isValidTimezoneOffset,
} from '@functions/timezone';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export type ThemePref = 'light' | 'dark' | 'system';
export type DensityPref = 'comfortable' | 'compact';
export type CopyModePref = 'enter' | 'paste' | 'off';

export interface Prefs {
  theme: ThemePref;
  density: DensityPref;
  // enter behavior: copy, copy & paste back, or do nothing.
  copyMode: CopyModePref;
  // anonymous telemetry opt-in.
  analytics: boolean;
  // default UTC offset (hours) for time-related boxes.
  timezoneOffset: number;
  // backend host overrides; blank means fall back to the env default.
  toolboxUrl: string;
  shortenUrl: string;
}

export const DEFAULT_PREFS: Prefs = {
  theme: 'system',
  density: 'comfortable',
  copyMode: 'enter',
  analytics: false,
  timezoneOffset: DEFAULT_TIMEZONE_OFFSET,
  toolboxUrl: '',
  shortenUrl: '',
};

const isTheme = (value: unknown): value is ThemePref =>
  value === 'light' || value === 'dark' || value === 'system';

const isDensity = (value: unknown): value is DensityPref =>
  value === 'comfortable' || value === 'compact';

const isCopyMode = (value: unknown): value is CopyModePref =>
  value === 'enter' || value === 'paste' || value === 'off';

// validate that a runtime override is a usable http(s) url, or blank.
export const isValidServerUrl = (value: string): boolean => {
  if (value.trim() === '') return true;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

export const loadPrefs = (): Prefs => {
  const prefs = readLocalPrefs();
  return {
    theme: isTheme(prefs.theme) ? prefs.theme : DEFAULT_PREFS.theme,
    density: isDensity(prefs.density) ? prefs.density : DEFAULT_PREFS.density,
    copyMode: isCopyMode(prefs.copyMode)
      ? prefs.copyMode
      : DEFAULT_PREFS.copyMode,
    analytics:
      typeof prefs.analytics === 'boolean'
        ? prefs.analytics
        : DEFAULT_PREFS.analytics,
    timezoneOffset:
      typeof prefs.timezoneOffset === 'number' &&
      isValidTimezoneOffset(prefs.timezoneOffset)
        ? prefs.timezoneOffset
        : DEFAULT_PREFS.timezoneOffset,
    toolboxUrl:
      typeof prefs.toolboxUrl === 'string' && isValidServerUrl(prefs.toolboxUrl)
        ? prefs.toolboxUrl
        : DEFAULT_PREFS.toolboxUrl,
    shortenUrl:
      typeof prefs.shortenUrl === 'string' && isValidServerUrl(prefs.shortenUrl)
        ? prefs.shortenUrl
        : DEFAULT_PREFS.shortenUrl,
  };
};

// push the subset of prefs that plain (non-react) modules need to read.
const syncRuntimePrefs = (prefs: Prefs): void => {
  setRuntimePrefs({
    timezoneOffset: prefs.timezoneOffset,
    toolboxUrl: prefs.toolboxUrl,
    shortenUrl: prefs.shortenUrl,
    analytics: prefs.analytics,
  });
};

// apply theme + density to the document root so css variables can react.
const applyDocumentPrefs = (prefs: Prefs): void => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.theme = prefs.theme;
  root.dataset.density = prefs.density;
};

interface PreferencesContextType {
  prefs: Prefs;
  setPref: <K extends keyof Prefs>(key: K, value: Prefs[K]) => void;
  resetPrefs: () => void;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(
  undefined,
);

export const usePreferences = (): PreferencesContextType => {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
};

interface PreferencesProviderProps {
  children: React.ReactNode;
}

export const PreferencesProvider: React.FC<PreferencesProviderProps> = ({
  children,
}) => {
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);

  // keep storage, document and the runtime singleton in sync with state.
  useEffect(() => {
    patchLocalPrefs(prefs);
    applyDocumentPrefs(prefs);
    syncRuntimePrefs(prefs);
  }, [prefs]);

  const setPref = useCallback(
    <K extends keyof Prefs>(key: K, value: Prefs[K]) => {
      setPrefs((p) => ({ ...p, [key]: value }));
    },
    [],
  );

  const resetPrefs = useCallback(() => {
    setPrefs(DEFAULT_PREFS);
  }, []);

  const value = useMemo<PreferencesContextType>(
    () => ({ prefs, setPref, resetPrefs }),
    [prefs, setPref, resetPrefs],
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
};
