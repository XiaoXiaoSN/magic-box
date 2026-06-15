import { beforeEach, describe, expect, it } from 'vitest';
import {
  LOCAL_PREFS_KEY,
  patchLocalPrefs,
  readLocalPrefs,
} from '../localPrefs';

describe('local preferences', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns an empty object for missing or malformed preferences', () => {
    expect(readLocalPrefs()).toEqual({});

    localStorage.setItem(LOCAL_PREFS_KEY, '{');

    expect(readLocalPrefs()).toEqual({});
  });

  it('merges new preference fields into existing stored fields', () => {
    localStorage.setItem(
      LOCAL_PREFS_KEY,
      JSON.stringify({ locale: 'tw', theme: 'dark' }),
    );

    patchLocalPrefs({ density: 'compact' });

    expect(JSON.parse(localStorage.getItem(LOCAL_PREFS_KEY) ?? '{}')).toEqual({
      locale: 'tw',
      theme: 'dark',
      density: 'compact',
    });
  });
});
