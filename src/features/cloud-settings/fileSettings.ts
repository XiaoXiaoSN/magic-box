import { SETTINGS_STORAGE_KEY } from '../../contexts/SettingsContext';
import { LOCAL_PREFS_KEY, readLocalPrefs } from '../../functions/localPrefs';
import {
  getLocalStorage,
  notifyLocalStorageChange,
} from '../../functions/storage';
import type { Config } from './config';

export function applySettingsFile({ prefs, settings, locale }: Config): void {
  const storage = getLocalStorage();
  if (!storage) throw new Error('Settings storage unavailable');

  const previousPrefs = storage.getItem(LOCAL_PREFS_KEY);
  const nextPrefs = JSON.stringify({ ...readLocalPrefs(), ...prefs, locale });
  const nextSettings = JSON.stringify(settings);
  storage.setItem(LOCAL_PREFS_KEY, nextPrefs);
  try {
    storage.setItem(SETTINGS_STORAGE_KEY, nextSettings);
  } catch (error) {
    if (previousPrefs === null) storage.removeItem(LOCAL_PREFS_KEY);
    else storage.setItem(LOCAL_PREFS_KEY, previousPrefs);
    throw error;
  }

  // Browsers dispatch storage events to other tabs. Notify the providers in
  // this tab after both writes have succeeded.
  for (const key of [LOCAL_PREFS_KEY, SETTINGS_STORAGE_KEY]) {
    notifyLocalStorageChange(key);
  }
}
