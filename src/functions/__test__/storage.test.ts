import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearLocalStorage,
  readJson,
  readStorageItem,
  removeStorageItem,
  writeJson,
  writeStorageItem,
} from '../storage';

describe('best effort local storage access', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('survives a localStorage property that throws', () => {
    const descriptor = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('blocked', 'SecurityError');
      },
    });

    try {
      expect(readStorageItem('key')).toBeNull();
      expect(() => writeStorageItem('key', 'value')).not.toThrow();
      expect(() => removeStorageItem('key')).not.toThrow();
      expect(() => clearLocalStorage()).not.toThrow();
      expect(
        readJson('key', (value): value is object => typeof value === 'object'),
      ).toBeNull();
    } finally {
      if (descriptor) Object.defineProperty(window, 'localStorage', descriptor);
    }
  });

  it('survives storage method failures at each operation boundary', () => {
    const storage = window.localStorage;
    const getItem = vi.spyOn(storage, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    expect(readStorageItem('key')).toBeNull();
    getItem.mockRestore();

    const setItem = vi.spyOn(storage, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    expect(() => writeStorageItem('key', 'value')).not.toThrow();
    expect(() => writeJson('key', { value: true })).not.toThrow();
    setItem.mockRestore();

    const removeItem = vi
      .spyOn(storage, 'removeItem')
      .mockImplementation(() => {
        throw new DOMException('blocked', 'SecurityError');
      });
    expect(() => removeStorageItem('key')).not.toThrow();
    removeItem.mockRestore();

    const clear = vi.spyOn(storage, 'clear').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    expect(() => clearLocalStorage()).not.toThrow();
    clear.mockRestore();
  });

  it('returns only validated JSON values', () => {
    writeJson('key', { value: 3 });

    expect(
      readJson('key', (value): value is { value: number } => {
        return (
          typeof value === 'object' &&
          value !== null &&
          'value' in value &&
          typeof value.value === 'number'
        );
      }),
    ).toEqual({ value: 3 });
    expect(
      readJson('key', (value): value is { value: string } => {
        return (
          typeof value === 'object' &&
          value !== null &&
          'value' in value &&
          typeof value.value === 'string'
        );
      }),
    ).toBeNull();
  });
});
