import {
  activateLocalAIPrivacy,
  isPrivateInput,
} from '@functions/localAIPrivacy';
import { LOCAL_DATA_CLEARED_EVENT } from '@functions/storage';
import { utf8ByteLength } from '@functions/textSize';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export const INPUT_DRAFT_STORAGE_KEY = 'mb_input_draft';
export const MAX_INPUT_DRAFT_BYTES = 64 * 1024;

const STORAGE_VERSION = 1;
const STORAGE_WRITE_DELAY_MS = 150;

interface StoredInputDraft {
  version: typeof STORAGE_VERSION;
  input: string;
}

interface InputDraftContextValue {
  draft: string;
  clearDraft: () => void;
  clearVersion: number;
  updateDraft: (value: string, options?: { persist?: boolean }) => void;
}

const InputDraftContext = createContext<InputDraftContextValue | null>(null);

const getSessionStorage = (): Storage | null => {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

const removeStoredDraft = (): void => {
  const storage = getSessionStorage();
  if (!storage) return;
  try {
    storage.removeItem(INPUT_DRAFT_STORAGE_KEY);
  } catch {
    // session storage is best effort; the in-memory draft remains usable
  }
};

const readStoredDraft = (): string => {
  const storage = getSessionStorage();
  if (!storage) return '';

  let raw: string | null;
  try {
    raw = storage.getItem(INPUT_DRAFT_STORAGE_KEY);
  } catch {
    return '';
  }
  if (raw === null) return '';

  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      removeStoredDraft();
      return '';
    }
    const record = parsed as Record<string, unknown>;
    if (
      record.version !== STORAGE_VERSION ||
      typeof record.input !== 'string' ||
      utf8ByteLength(record.input) > MAX_INPUT_DRAFT_BYTES
    ) {
      if (typeof record.input === 'string' && isPrivateInput(record.input)) {
        activateLocalAIPrivacy();
      }
      removeStoredDraft();
      return '';
    }
    if (isPrivateInput(record.input)) {
      activateLocalAIPrivacy();
      removeStoredDraft();
      return '';
    }
    return record.input;
  } catch {
    removeStoredDraft();
    return '';
  }
};

const writeStoredDraft = (value: string): void => {
  if (
    !value ||
    isPrivateInput(value) ||
    utf8ByteLength(value) > MAX_INPUT_DRAFT_BYTES
  ) {
    removeStoredDraft();
    return;
  }

  const storage = getSessionStorage();
  if (!storage) return;
  const record: StoredInputDraft = { version: STORAGE_VERSION, input: value };
  try {
    storage.setItem(INPUT_DRAFT_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // session storage is best effort; the in-memory draft remains usable
  }
};

export const InputDraftProvider = ({
  children,
}: PropsWithChildren): React.JSX.Element => {
  const [draft, setDraft] = useState(readStoredDraft);
  const [clearVersion, setClearVersion] = useState(0);
  const draftRef = useRef(draft);
  const writeTimerRef = useRef<number | null>(null);

  const cancelWrite = useCallback((): void => {
    if (writeTimerRef.current === null) return;
    window.clearTimeout(writeTimerRef.current);
    writeTimerRef.current = null;
  }, []);

  const clearDraft = useCallback((): void => {
    cancelWrite();
    draftRef.current = '';
    setDraft('');
    removeStoredDraft();
    setClearVersion((version) => version + 1);
  }, [cancelWrite]);

  const updateDraft = useCallback(
    (value: string, options?: { persist?: boolean }): void => {
      cancelWrite();
      draftRef.current = value;

      if (isPrivateInput(value)) {
        activateLocalAIPrivacy();
        draftRef.current = '';
        setDraft('');
        removeStoredDraft();
        return;
      }

      setDraft(value);
      if (!value || utf8ByteLength(value) > MAX_INPUT_DRAFT_BYTES) {
        removeStoredDraft();
        return;
      }
      if (options?.persist === false) return;

      writeTimerRef.current = window.setTimeout(() => {
        writeTimerRef.current = null;
        writeStoredDraft(draftRef.current);
      }, STORAGE_WRITE_DELAY_MS);
    },
    [cancelWrite],
  );

  useEffect(() => {
    const handlePageHide = (): void => {
      cancelWrite();
      writeStoredDraft(draftRef.current);
    };
    const handleClear = (): void => clearDraft();

    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener(LOCAL_DATA_CLEARED_EVENT, handleClear);
    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener(LOCAL_DATA_CLEARED_EVENT, handleClear);
    };
  }, [cancelWrite, clearDraft]);

  const value = useMemo<InputDraftContextValue>(
    () => ({ draft, clearDraft, clearVersion, updateDraft }),
    [clearDraft, clearVersion, draft, updateDraft],
  );

  return (
    <InputDraftContext.Provider value={value}>
      {children}
    </InputDraftContext.Provider>
  );
};

export const useInputDraft = (): InputDraftContextValue => {
  const context = useContext(InputDraftContext);
  if (context) return context;
  return {
    draft: '',
    clearDraft: () => undefined,
    clearVersion: 0,
    updateDraft: () => undefined,
  };
};
