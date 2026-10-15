import { readJson, writeJson } from '@functions/storage';
import type { BoxSource } from '@modules/BoxSource';
import { boxSources } from '@modules/boxSources';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

export interface BoxSetting {
  id: string;
  secondaryOrder: number;
  enabled: boolean;
}

export interface Settings {
  version?: number;
  boxes: Record<string, BoxSetting>;
}

export const SETTINGS_VERSION = 2;

const SETTINGS_STORAGE_KEY = 'mb_settings';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const buildDefaultSettings = (): Settings => ({
  version: SETTINGS_VERSION,
  boxes: Object.fromEntries(
    boxSources.map((box, idx) => [
      box.id ?? box.name,
      {
        id: box.id ?? box.name,
        enabled: !box.defaultDisabled,
        secondaryOrder: idx,
      },
    ]),
  ) as Record<string, BoxSetting>,
});

const migrateBoxIds = (
  boxes: Record<string, unknown>,
): Record<string, unknown> => {
  const migrated = { ...boxes };
  for (const source of boxSources) {
    const currentId = source.id ?? source.name;
    if (!Object.hasOwn(migrated, currentId)) {
      const legacyIds = [source.name, ...(source.legacyNames ?? [])];
      const legacyId = legacyIds.find((id) => Object.hasOwn(migrated, id));
      if (legacyId !== undefined) {
        migrated[currentId] = migrated[legacyId];
      }
    }
    delete migrated[source.name];
    for (const legacyId of source.legacyNames ?? []) delete migrated[legacyId];
  }
  return migrated;
};

const normalizeSettings = (value: unknown): Settings => {
  const defaults = buildDefaultSettings();
  if (!isRecord(value)) return defaults;

  const storedBoxes = isRecord(value.boxes) ? migrateBoxIds(value.boxes) : {};
  const storedVersion = typeof value.version === 'number' ? value.version : 0;
  const boxes = Object.fromEntries(
    boxSources.map((box, idx) => {
      const id = box.id ?? box.name;
      const fallback = defaults.boxes[id];
      const stored = storedBoxes[id];
      const setting = isRecord(stored) ? stored : {};
      const normalized: BoxSetting = {
        id,
        enabled:
          typeof setting.enabled === 'boolean'
            ? setting.enabled
            : fallback.enabled,
        secondaryOrder:
          typeof setting.secondaryOrder === 'number' &&
          Number.isFinite(setting.secondaryOrder)
            ? setting.secondaryOrder
            : idx,
      };

      if (storedVersion < 1 && id === 'duration') {
        normalized.enabled = true;
      }

      return [id, normalized];
    }),
  ) as Record<string, BoxSetting>;

  return { version: SETTINGS_VERSION, boxes };
};

export const SettingsStorage = {
  get(): Settings {
    const stored = readJson(SETTINGS_STORAGE_KEY, isRecord);
    return stored ? normalizeSettings(stored) : buildDefaultSettings();
  },
  save(settings: Settings): void {
    writeJson(SETTINGS_STORAGE_KEY, normalizeSettings(settings));
  },
};

interface SettingsContextType {
  settings: Settings;
  filteredBoxSources: BoxSource[];
  resetSettings: () => void;
  updateSettings: (newSettings: Settings) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined,
);

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

interface SettingsProviderProps {
  children: React.ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({
  children,
}) => {
  const [settings, setSettings] = useState<Settings>(SettingsStorage.get);

  const resetSettings = useCallback(() => {
    setSettings(buildDefaultSettings());
  }, []);

  const updateSettings = useCallback((newSettings: Settings) => {
    setSettings(newSettings);
    SettingsStorage.save(newSettings);
  }, []);

  // Filter enabled sources and preserve the user's registry order.
  const getFilteredAndSortedBoxSources = useMemo((): BoxSource[] => {
    const enabledBoxSources = boxSources.filter(
      (boxSource) => settings.boxes[boxSource.id ?? boxSource.name]?.enabled,
    );

    return enabledBoxSources
      .map((boxSource) => {
        const setting = settings.boxes[boxSource.id ?? boxSource.name];
        return {
          ...boxSource,
          secondaryOrder: setting?.secondaryOrder ?? 0,
        };
      })
      .sort((a, b) => (a.secondaryOrder ?? 0) - (b.secondaryOrder ?? 0));
  }, [settings.boxes]);

  const value = useMemo<SettingsContextType>(
    () => ({
      resetSettings,
      settings,
      updateSettings,
      filteredBoxSources: getFilteredAndSortedBoxSources,
    }),
    [resetSettings, settings, updateSettings, getFilteredAndSortedBoxSources],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};
