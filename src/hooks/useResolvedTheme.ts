import { getDarkQuery, prefersDark, type ThemeMode } from '@global/theme';
import { useSyncExternalStore } from 'react';
import { usePreferences } from '../contexts/PreferencesContext';

// module-level so the subscribe/snapshot identities stay stable across renders
// and useSyncExternalStore never tears down its listener.
const subscribe = (onStoreChange: () => void): (() => void) => {
  const query = getDarkQuery();
  if (!query) return () => {};
  query.addEventListener('change', onStoreChange);
  return () => query.removeEventListener('change', onStoreChange);
};

// snapshot is a primitive, so repeated reads never trip the "getSnapshot should
// be cached" warning.
const getSnapshot = (): boolean => prefersDark();
const getServerSnapshot = (): boolean => false;

/**
 * The theme actually being rendered: the stored preference, with `system`
 * collapsed against the OS setting and kept live as the OS setting changes.
 */
export const useResolvedTheme = (): ThemeMode => {
  const { prefs } = usePreferences();
  const systemDark = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  if (prefs.theme === 'light' || prefs.theme === 'dark') return prefs.theme;
  return systemDark ? 'dark' : 'light';
};

export default useResolvedTheme;
