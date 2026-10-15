import {
  readJsonResult,
  type StorageReadStatus,
  writeJson,
} from '@functions/storage';
import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'mb_search_history';
const DEFAULT_MAX_ITEMS = 50;

export interface HistoryItem {
  id: string;
  timestamp: number;
  input: string;
}

const isHistoryItem = (value: unknown): value is HistoryItem => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const item = value as Record<string, unknown>;
  return (
    typeof item.id === 'string' &&
    typeof item.input === 'string' &&
    typeof item.timestamp === 'number' &&
    Number.isFinite(item.timestamp)
  );
};

interface LoadedHistory {
  items: HistoryItem[];
  status: StorageReadStatus;
}

function loadHistory(): LoadedHistory {
  const parsed = readJsonResult<unknown[]>(
    STORAGE_KEY,
    (value): value is unknown[] => Array.isArray(value),
  );
  return {
    items: parsed.status === 'ok' ? parsed.value.filter(isHistoryItem) : [],
    status: parsed.status,
  };
}

function persistHistory(items: HistoryItem[]): void {
  writeJson(STORAGE_KEY, items);
}

let fallbackIdCounter = 0;

const createHistoryId = (): string => {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }

  fallbackIdCounter += 1;
  return `${Date.now()}-${fallbackIdCounter}`;
};

interface UseSearchHistoryOptions {
  maxItems?: number;
}

interface UseSearchHistoryReturn {
  history: HistoryItem[];
  addEntry: (input: string) => void;
  removeEntry: (id: string) => void;
  // Removes every entry whose text is one of `inputs`.
  removeInputs: (inputs: readonly string[]) => void;
  clearHistory: () => void;
}

export function useSearchHistory(
  opts?: UseSearchHistoryOptions,
): UseSearchHistoryReturn {
  const maxItems = opts?.maxItems ?? DEFAULT_MAX_ITEMS;
  const [loaded] = useState<LoadedHistory>(loadHistory);
  const [history, setHistory] = useState<HistoryItem[]>(loaded.items);
  const readFailedOnMountRef = useRef(loaded.status === 'unavailable');
  const mountedRef = useRef(false);

  const historyForMutation = useCallback((current: HistoryItem[]) => {
    if (!readFailedOnMountRef.current) return current;

    const retry = loadHistory();
    if (retry.status === 'unavailable') return current;

    readFailedOnMountRef.current = false;
    const currentIds = new Set(current.map((item) => item.id));
    return [
      ...current,
      ...retry.items.filter((item) => !currentIds.has(item.id)),
    ];
  }, []);

  // Persist whenever history changes.
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    persistHistory(history);
  }, [history]);

  const addEntry = useCallback(
    (input: string) => {
      const trimmed = input.trim();
      if (!trimmed) return;

      setHistory((prev) => {
        const current = historyForMutation(prev);
        // De-duplicate: if input already exists, remove the old entry so the
        // new one goes to the top with an updated timestamp.
        const deduplicated = current.filter((item) => item.input !== trimmed);

        const entry: HistoryItem = {
          id: createHistoryId(),
          timestamp: Date.now(),
          input: trimmed,
        };

        // Prepend new entry and cap at maxItems.
        return [entry, ...deduplicated].slice(0, maxItems);
      });
    },
    [historyForMutation, maxItems],
  );

  const removeEntry = useCallback(
    (id: string) => {
      setHistory((prev) =>
        historyForMutation(prev).filter((item) => item.id !== id),
      );
    },
    [historyForMutation],
  );

  const removeInputs = useCallback(
    (inputs: readonly string[]) => {
      if (!inputs.length) return;
      const doomed = new Set(inputs);
      setHistory((prev) =>
        historyForMutation(prev).filter((item) => !doomed.has(item.input)),
      );
    },
    [historyForMutation],
  );

  const clearHistory = useCallback(() => {
    readFailedOnMountRef.current = false;
    setHistory([]);
  }, []);

  return { history, addEntry, removeEntry, removeInputs, clearHistory };
}
