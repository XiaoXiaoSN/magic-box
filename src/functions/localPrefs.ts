export const LOCAL_PREFS_KEY = 'mb_prefs';

const getLocalStorage = (): Storage | null => {
  if (typeof window === 'undefined') return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const readLocalPrefs = (): Record<string, unknown> => {
  const storage = getLocalStorage();
  if (!storage) return {};

  try {
    const raw = storage.getItem(LOCAL_PREFS_KEY);
    if (!raw) return {};

    const parsed: unknown = JSON.parse(raw);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

export const patchLocalPrefs = <T extends object>(patch: T): void => {
  const storage = getLocalStorage();
  if (!storage) return;

  storage.setItem(
    LOCAL_PREFS_KEY,
    JSON.stringify({ ...readLocalPrefs(), ...patch }),
  );
};
