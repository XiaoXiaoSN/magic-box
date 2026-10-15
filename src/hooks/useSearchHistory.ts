import { isPrivateInput } from '@functions/localAIPrivacy';
import {
  readJsonResult,
  type StorageReadStatus,
  writeJson,
} from '@functions/storage';
import { useCallback, useEffect, useReducer } from 'react';

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
  removedPrivate: boolean;
}

function loadHistory(): LoadedHistory {
  const parsed = readJsonResult<unknown[]>(
    STORAGE_KEY,
    (value): value is unknown[] => Array.isArray(value),
  );
  const validItems =
    parsed.status === 'ok' ? parsed.value.filter(isHistoryItem) : [];
  const items = validItems.filter((item) => !isPrivateInput(item.input));
  return {
    items,
    status: parsed.status,
    removedPrivate: validItems.length !== items.length,
  };
}

function persistHistory(items: HistoryItem[]): void {
  writeJson(STORAGE_KEY, items);
}

type HistoryOperation =
  | { type: 'add'; entry: HistoryItem; maxItems: number }
  | { type: 'removeEntry'; id: string }
  | { type: 'removeInputs'; inputs: readonly string[] }
  | { type: 'clear' };

interface HistoryState extends LoadedHistory {
  dirty: boolean;
  pending: HistoryOperation[];
}

type HistoryAction =
  | { type: 'mutate'; operation: HistoryOperation }
  | { type: 'resolve'; loaded: LoadedHistory };

const applyHistoryOperation = (
  items: HistoryItem[],
  operation: HistoryOperation,
): HistoryItem[] => {
  switch (operation.type) {
    case 'add':
      return [
        operation.entry,
        ...items.filter((item) => item.input !== operation.entry.input),
      ].slice(0, operation.maxItems);
    case 'removeEntry':
      return items.filter((item) => item.id !== operation.id);
    case 'removeInputs': {
      const removed = new Set(operation.inputs);
      return items.filter((item) => !removed.has(item.input));
    }
    case 'clear':
      return [];
  }
};

const reduceHistory = (
  state: HistoryState,
  action: HistoryAction,
): HistoryState => {
  switch (action.type) {
    case 'mutate':
      return {
        ...state,
        items: applyHistoryOperation(state.items, action.operation),
        dirty: state.status !== 'unavailable',
        pending:
          state.status === 'unavailable'
            ? [...state.pending, action.operation]
            : state.pending,
      };
    case 'resolve':
      return {
        items: state.pending.reduce(applyHistoryOperation, action.loaded.items),
        status: action.loaded.status,
        removedPrivate: false,
        dirty: true,
        pending: [],
      };
  }
};

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
  const [state, dispatch] = useReducer(
    reduceHistory,
    undefined,
    (): HistoryState => {
      const loaded = loadHistory();
      return {
        ...loaded,
        dirty: loaded.removedPrivate,
        pending: [],
      };
    },
  );

  useEffect(() => {
    if (state.status === 'unavailable') {
      if (state.pending.length === 0) return;

      const loaded = loadHistory();
      if (loaded.status !== 'unavailable') {
        dispatch({ type: 'resolve', loaded });
      }
      return;
    }

    if (state.dirty) {
      persistHistory(state.items);
    }
  }, [state]);

  const addEntry = useCallback(
    (input: string) => {
      const trimmed = input.trim();
      if (!trimmed || isPrivateInput(trimmed)) return;

      dispatch({
        type: 'mutate',
        operation: {
          type: 'add',
          entry: {
            id: createHistoryId(),
            timestamp: Date.now(),
            input: trimmed,
          },
          maxItems,
        },
      });
    },
    [maxItems],
  );

  const removeEntry = useCallback((id: string) => {
    dispatch({ type: 'mutate', operation: { type: 'removeEntry', id } });
  }, []);

  const removeInputs = useCallback((inputs: readonly string[]) => {
    if (!inputs.length) return;
    dispatch({
      type: 'mutate',
      operation: { type: 'removeInputs', inputs },
    });
  }, []);

  const clearHistory = useCallback(() => {
    dispatch({ type: 'mutate', operation: { type: 'clear' } });
  }, []);

  return {
    history: state.items,
    addEntry,
    removeEntry,
    removeInputs,
    clearHistory,
  };
}
