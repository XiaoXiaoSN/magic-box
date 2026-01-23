import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { boxSources } from '@modules/boxSources';

import type { BoxSource } from '@modules/BoxSource';

export interface BoxSetting {
  id: string;
  priority: number;
  secondaryOrder: number;
  enabled: boolean;
}

export interface Settings {
  boxes: Record<string, BoxSetting>;
}

const defaultSettings: Settings = {
  boxes: Object.fromEntries(
    boxSources.map((box, idx) => [
      box.name,
      {
        id: box.name,
        enabled: true,
        priority: box.priority ?? 10,
        secondaryOrder: idx,
      },
    ])
  ) as Record<string, BoxSetting>,
};

const SETTINGS_STORAGE_KEY = 'mb_settings';

const validatePriority = (value: number): number => {
  return Number.isNaN(value) ? 10 : Math.max(0, Math.min(99, value));
};

export const SettingsStorage = {
  get(): Settings {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (stored) {
      const parsed: Settings = JSON.parse(stored);
      // Ensure all box sources exist in settings
      boxSources.forEach((box, idx) => {
        if (!parsed.boxes[box.name]) {
          parsed.boxes[box.name] = {
            id: box.name,
            enabled: true,
            priority: validatePriority(box.priority ?? 10),
            secondaryOrder: idx,
          };
        } else {
          // Validate existing priority values
          parsed.boxes[box.name].priority = validatePriority(
            parsed.boxes[box.name].priority
          );
        }
      });
      return parsed;
    }
    return defaultSettings;
  },
  save(settings: Settings): void {
    // Validate priorities before saving
    const validatedSettings = {
      ...settings,
      boxes: Object.fromEntries(
        Object.entries(settings.boxes).map(([key, box]) => [
          key,
          { ...box, priority: validatePriority(box.priority) },
        ])
      ),
    };
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify(validatedSettings)
    );
  },
};

interface SettingsContextType {
  settings: Settings;
  filteredBoxSources: BoxSource[];
  updateSettings: (newSettings: Settings) => void;
  validatePriority: (value: string) => number;
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined
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
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  useEffect(() => {
    const loaded = SettingsStorage.get();
    setSettings(loaded);
  }, []);

  const updateSettings = useCallback((newSettings: Settings) => {
    setSettings(newSettings);
    SettingsStorage.save(newSettings);
  }, []);

  // Apply settings to box sources - filter enabled and sort by priority (memoized for performance)
  const getFilteredAndSortedBoxSources = useMemo((): BoxSource[] => {
    const enabledBoxSources = boxSources.filter(
      (boxSource) => settings.boxes[boxSource.name]?.enabled
    );

    return enabledBoxSources
      .map((boxSource) => {
        const setting = settings.boxes[boxSource.name];
        return {
          ...boxSource,
          priority: validatePriority(
            setting?.priority ?? boxSource.priority ?? 10
          ),
          secondaryOrder: setting?.secondaryOrder ?? 0,
        };
      })
      .sort((a, b) => {
        // Sort by priority first (higher priority first)
        if (a.priority !== b.priority) {
          return (b.priority ?? 0) - (a.priority ?? 0);
        }
        // Then by secondary order
        return (a.secondaryOrder ?? 0) - (b.secondaryOrder ?? 0);
      });
  }, [settings.boxes]);

  // Helper function to validate priority input from UI
  const validatePriorityInput = useCallback((value: string): number => {
    const num = parseInt(value, 10);
    return validatePriority(num);
  }, []);

  const value = useMemo<SettingsContextType>(
    () => ({
      settings,
      updateSettings,
      filteredBoxSources: getFilteredAndSortedBoxSources,
      validatePriority: validatePriorityInput,
    }),
    [
      settings,
      updateSettings,
      getFilteredAndSortedBoxSources,
      validatePriorityInput,
    ]
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};
