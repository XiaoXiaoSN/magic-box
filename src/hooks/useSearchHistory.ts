import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'mb_search_history';
const DEFAULT_MAX_ITEMS = 50;

export interface HistoryItem {
  id: string;
  timestamp: number;
  input: string;
}

function loadHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function persistHistory(items: HistoryItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // localStorage full or unavailable — silently ignore.
  }
}

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
  const [history, setHistory] = useState<HistoryItem[]>(loadHistory);

  // Persist whenever history changes.
  useEffect(() => {
    persistHistory(history);
  }, [history]);

  const addEntry = useCallback(
    (input: string) => {
      const trimmed = input.trim();
      if (!trimmed) return;

      setHistory((prev) => {
        // De-duplicate: if input already exists, remove the old entry so the
        // new one goes to the top with an updated timestamp.
        const deduplicated = prev.filter((item) => item.input !== trimmed);

        const entry: HistoryItem = {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          input: trimmed,
        };

        // Prepend new entry and cap at maxItems.
        return [entry, ...deduplicated].slice(0, maxItems);
      });
    },
    [maxItems],
  );

  const removeEntry = useCallback((id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const removeInputs = useCallback((inputs: readonly string[]) => {
    if (!inputs.length) return;
    const doomed = new Set(inputs);
    setHistory((prev) => prev.filter((item) => !doomed.has(item.input)));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return { history, addEntry, removeEntry, removeInputs, clearHistory };
}
