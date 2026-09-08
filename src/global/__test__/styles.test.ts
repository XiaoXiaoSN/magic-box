import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const css = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../styles.css'),
  'utf8',
);

describe('editable text styles', () => {
  it('renders option directive punctuation without font ligatures', () => {
    const textareaRule = css.match(/\.input-card textarea\s*\{([^}]*)\}/)?.[1];

    expect(textareaRule).toContain('font-variant-ligatures: none');
    expect(textareaRule).toMatch(
      /font-feature-settings:\s*"liga" 0,\s*"clig" 0,\s*"calt" 0/,
    );
  });
});
