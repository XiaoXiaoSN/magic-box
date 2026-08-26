/**
 * Single source of truth for theme resolution and palette tokens.
 *
 * `styles.css` owns the tokens the app's own CSS reads; the maps below mirror
 * them so MUI (which needs real color values to derive hover/alpha variants and
 * therefore cannot be handed `var(--accent)`) stays in sync. The mirror is
 * enforced by `__test__/theme.test.ts`, which parses styles.css and diffs it
 * against these maps — edit both or the test fails.
 */

export type ThemePref = 'light' | 'dark' | 'system';
export type ThemeMode = 'light' | 'dark';

const DARK_QUERY = '(prefers-color-scheme: dark)';

let darkQuery: MediaQueryList | null = null;
let darkQueryResolved = false;

/**
 * Cached MediaQueryList. `matchMedia()` allocates a fresh object on every call
 * and the resolved-theme snapshot is read on each render pass, so the list is
 * created once and reused.
 */
export const getDarkQuery = (): MediaQueryList | null => {
  if (!darkQueryResolved) {
    darkQueryResolved = true;
    darkQuery =
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia(DARK_QUERY)
        : null;
  }
  return darkQuery;
};

export const prefersDark = (): boolean => getDarkQuery()?.matches ?? false;

/** Collapse the stored preference into the mode actually rendered. */
export const resolveTheme = (pref: ThemePref): ThemeMode => {
  if (pref === 'dark' || pref === 'light') return pref;
  return prefersDark() ? 'dark' : 'light';
};

/**
 * Write the resolved mode onto <html> so the css variable blocks in styles.css
 * switch. Kept separate from the React tree so index.tsx can call it before
 * first paint and avoid a light flash.
 */
export const applyThemeMode = (mode: ThemeMode): void => {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = mode;
};

/** Colour tokens mirrored from styles.css. Non-colour tokens are CSS-only. */
export const themeTokens: Record<ThemeMode, Record<string, string>> = {
  light: {
    '--bg': '#f8fafc',
    '--bg-elev': '#ffffff',
    '--ink': '#0f172a',
    '--ink-2': '#334155',
    '--ink-3': '#64748b',
    '--ink-4': '#94a3b8',
    '--line': '#e6ecf2',
    '--line-2': '#d6dee7',
    '--muted': '#f1f5f9',
    '--muted-2': '#e2e8f0',
    '--accent': '#2563eb',
    '--accent-soft': '#e7effd',
    '--accent-ink': '#1d4ed8',
    '--on-accent': '#ffffff',
    '--danger': '#dc2626',
    '--danger-soft': '#fef2f2',
    '--danger-line': '#fecaca',
    '--success': '#16a34a',
  },
  dark: {
    '--bg': '#0b1120',
    '--bg-elev': '#131b2e',
    '--ink': '#e8edf5',
    '--ink-2': '#c2ccda',
    '--ink-3': '#8b97a8',
    '--ink-4': '#64718a',
    '--line': '#233047',
    '--line-2': '#2f3e59',
    '--muted': '#1a2436',
    '--muted-2': '#233047',
    '--accent': '#5b8bf5',
    '--accent-soft': '#1b2c4d',
    '--accent-ink': '#93b4fb',
    '--on-accent': '#0b1120',
    '--danger': '#f0616d',
    '--danger-soft': '#3a1a20',
    '--danger-line': '#63262f',
    '--success': '#34c97f',
  },
};

export const token = (mode: ThemeMode, name: string): string =>
  themeTokens[mode][name];
