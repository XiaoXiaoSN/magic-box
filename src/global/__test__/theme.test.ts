import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { resolveTheme, type ThemeMode, themeTokens } from '../theme';

const cssPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../styles.css',
);
// comments are stripped up front: a `/* ... --token ... */` note between two
// declarations would otherwise swallow the declaration that follows it.
const css = readFileSync(cssPath, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

/** Pull the declarations out of the first rule whose selector list matches. */
const readBlock = (selector: string): Record<string, string> => {
  const start = css.indexOf(selector);
  expect(start, `selector ${selector} missing from styles.css`).toBeGreaterThan(
    -1,
  );
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  const body = css.slice(open + 1, close);

  const declarations: Record<string, string> = {};
  for (const line of body.split(';')) {
    const [rawName, ...rest] = line.split(':');
    const name = rawName.trim();
    if (!name.startsWith('--')) continue;
    declarations[name] = rest.join(':').trim();
  }
  return declarations;
};

const blocks: Record<ThemeMode, Record<string, string>> = {
  light: readBlock(':root {'),
  dark: readBlock(':root[data-theme="dark"] {'),
};

describe('theme tokens', () => {
  it.each<ThemeMode>([
    'light',
    'dark',
  ])('mirrors every %s colour token declared in styles.css', (mode) => {
    for (const [name, value] of Object.entries(themeTokens[mode])) {
      expect(blocks[mode][name], `${mode} ${name}`).toBe(value);
    }
  });

  it('defines the same token names for both modes', () => {
    expect(Object.keys(themeTokens.dark).sort()).toEqual(
      Object.keys(themeTokens.light).sort(),
    );
  });

  it('declares every dark token that light declares', () => {
    // catches a token added to :root but forgotten in the dark block, which is
    // how dark mode silently inherits a light colour.
    const lightOnly = Object.keys(blocks.light).filter(
      (name) =>
        !(name in blocks.dark) &&
        // structural tokens are intentionally theme-independent
        ![
          '--radius',
          '--radius-lg',
          '--radius-sm',
          '--mono',
          '--sans',
          '--topbar-h',
          '--density-gap',
          '--density-pad',
        ].includes(name),
    );
    expect(lightOnly).toEqual([]);
  });
});

describe('resolveTheme', () => {
  it('passes explicit choices through', () => {
    expect(resolveTheme('light')).toBe('light');
    expect(resolveTheme('dark')).toBe('dark');
  });

  it('resolves system to a concrete mode', () => {
    expect(['light', 'dark']).toContain(resolveTheme('system'));
  });
});
