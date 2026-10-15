export const getLocalStorage = (): Storage | null => {
  if (typeof window === 'undefined') return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export const LOCAL_DATA_CLEARED_EVENT = 'magic-box:local-data-cleared';

export type StorageReadStatus = 'ok' | 'missing' | 'unavailable' | 'invalid';

export type StorageReadResult<T> =
  | { status: 'ok'; value: T }
  | { status: Exclude<StorageReadStatus, 'ok'>; value: null };

export const readStorageItemResult = (
  key: string,
): StorageReadResult<string> => {
  const storage = getLocalStorage();
  if (!storage) return { status: 'unavailable', value: null };

  try {
    const value = storage.getItem(key);
    return value === null
      ? { status: 'missing', value: null }
      : { status: 'ok', value };
  } catch {
    return { status: 'unavailable', value: null };
  }
};

export const readStorageItem = (key: string): string | null => {
  const result = readStorageItemResult(key);
  return result.status === 'ok' ? result.value : null;
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
  if (storage) {
    try {
      storage.clear();
    } catch {
      // storage is best effort; callers keep their in-memory state
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(LOCAL_DATA_CLEARED_EVENT));
  }
};

export const readJsonResult = <T>(
  key: string,
  validate: (value: unknown) => value is T,
): StorageReadResult<T> => {
  const rawResult = readStorageItemResult(key);
  if (rawResult.status !== 'ok') return rawResult;

  try {
    const parsed: unknown = JSON.parse(rawResult.value);
    return validate(parsed)
      ? { status: 'ok', value: parsed }
      : { status: 'invalid', value: null };
  } catch {
    return { status: 'invalid', value: null };
  }
};

export const readJson = <T>(
  key: string,
  validate: (value: unknown) => value is T,
): T | null => {
  const result = readJsonResult(key, validate);
  return result.status === 'ok' ? result.value : null;
};

export const writeJson = (key: string, value: unknown): void => {
  try {
    const serialized = JSON.stringify(value);
    if (serialized !== undefined) writeStorageItem(key, serialized);
  } catch {
    // serialization and storage are both best effort persistence steps
  }
};
