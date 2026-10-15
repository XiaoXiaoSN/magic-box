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
  priority: number;
  secondaryOrder: number;
  enabled: boolean;
}

export interface Settings {
  version?: number;
  boxes: Record<string, BoxSetting>;
}

const SETTINGS_VERSION = 1;

const SETTINGS_ID_MIGRATIONS: Record<string, string> = {
  'DMS Coordinates': 'Coordinates',
};

const SETTINGS_STORAGE_KEY = 'mb_settings';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const validatePriority = (value: number): number =>
  typeof value !== 'number' || Number.isNaN(value)
    ? 10
    : Math.max(0, Math.min(99, value));

export const buildDefaultSettings = (): Settings => ({
  version: SETTINGS_VERSION,
  boxes: Object.fromEntries(
    boxSources.map((box, idx) => [
      box.name,
      {
        id: box.name,
        enabled: !box.defaultDisabled,
        priority: validatePriority(box.priority ?? 10),
        secondaryOrder: idx,
      },
    ]),
  ) as Record<string, BoxSetting>,
});

const migrateBoxIds = (
  boxes: Record<string, unknown>,
): Record<string, unknown> => {
  const migrated = { ...boxes };
  for (const [oldId, currentId] of Object.entries(SETTINGS_ID_MIGRATIONS)) {
    if (!Object.hasOwn(migrated, currentId) && Object.hasOwn(migrated, oldId)) {
      migrated[currentId] = migrated[oldId];
    }
    delete migrated[oldId];
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
      const fallback = defaults.boxes[box.name];
      const stored = storedBoxes[box.name];
      const setting = isRecord(stored) ? stored : {};
      const normalized: BoxSetting = {
        id: box.name,
        enabled:
          typeof setting.enabled === 'boolean'
            ? setting.enabled
            : fallback.enabled,
        priority: validatePriority(
          typeof setting.priority === 'number'
            ? setting.priority
            : fallback.priority,
        ),
        secondaryOrder:
          typeof setting.secondaryOrder === 'number' &&
          Number.isFinite(setting.secondaryOrder)
            ? setting.secondaryOrder
            : idx,
      };

      if (storedVersion < 1 && box.name === 'Duration') {
        normalized.enabled = true;
      }

      return [box.name, normalized];
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
  validatePriority: (value: string) => number;
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

  // Apply settings to box sources - filter enabled and sort by priority (memoized for performance)
  const getFilteredAndSortedBoxSources = useMemo((): BoxSource[] => {
    const enabledBoxSources = boxSources.filter(
      (boxSource) => settings.boxes[boxSource.name]?.enabled,
    );

    return (
      enabledBoxSources
        .map((boxSource) => {
          const setting = settings.boxes[boxSource.name];
          return {
            ...boxSource,
            priority: validatePriority(
              setting?.priority ?? boxSource.priority ?? 10,
            ),
            secondaryOrder: setting?.secondaryOrder ?? 0,
          };
        })
        // Path B: sort solely by user-controlled drag order. priority kept on
        // settings shape for back-compat but no longer drives box placement.
        .sort((a, b) => (a.secondaryOrder ?? 0) - (b.secondaryOrder ?? 0))
    );
  }, [settings.boxes]);

  // Helper function to validate priority input from UI
  const validatePriorityInput = useCallback((value: string): number => {
    const num = parseInt(value, 10);
    return validatePriority(num);
  }, []);

  const value = useMemo<SettingsContextType>(
    () => ({
      resetSettings,
      settings,
      updateSettings,
      filteredBoxSources: getFilteredAndSortedBoxSources,
      validatePriority: validatePriorityInput,
    }),
    [
      resetSettings,
      settings,
      updateSettings,
      getFilteredAndSortedBoxSources,
      validatePriorityInput,
    ],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};
