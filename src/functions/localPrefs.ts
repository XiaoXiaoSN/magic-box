import { readJson, writeJson } from './storage';

export const LOCAL_PREFS_KEY = 'mb_prefs';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const readLocalPrefs = (): Record<string, unknown> => {
  return readJson(LOCAL_PREFS_KEY, isRecord) ?? {};
};

export const patchLocalPrefs = <T extends object>(patch: T): void => {
  writeJson(LOCAL_PREFS_KEY, { ...readLocalPrefs(), ...patch });
};
