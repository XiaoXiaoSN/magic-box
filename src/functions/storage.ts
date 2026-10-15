export const getLocalStorage = (): Storage | null => {
  if (typeof window === 'undefined') return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export const readStorageItem = (key: string): string | null => {
  const storage = getLocalStorage();
  if (!storage) return null;

  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
};

export const writeStorageItem = (key: string, value: string): void => {
  const storage = getLocalStorage();
  if (!storage) return;

  try {
    storage.setItem(key, value);
  } catch {
    // storage is best effort; callers keep their in-memory state
  }
};

export const removeStorageItem = (key: string): void => {
  const storage = getLocalStorage();
  if (!storage) return;

  try {
    storage.removeItem(key);
  } catch {
    // storage is best effort; callers keep their in-memory state
  }
};

export const clearLocalStorage = (): void => {
  const storage = getLocalStorage();
  if (!storage) return;

  try {
    storage.clear();
  } catch {
    // storage is best effort; callers keep their in-memory state
  }
};

export const readJson = <T>(
  key: string,
  validate: (value: unknown) => value is T,
): T | null => {
  const raw = readStorageItem(key);
  if (raw === null) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    return validate(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const writeJson = (key: string, value: unknown): void => {
  try {
    const serialized = JSON.stringify(value);
    if (serialized !== undefined) writeStorageItem(key, serialized);
  } catch {
    // serialization and storage are both best effort persistence steps
  }
};
