import { type FormEvent, useEffect, useState } from 'react';
import { MAX_INPUT_DRAFT_BYTES } from '../../contexts/InputDraftContext';
import { useLocale } from '../../contexts/LocaleContext';
import { isPrivateInput } from '../../functions/localAIPrivacy';
import {
  getLocalStorage,
  LOCAL_DATA_CLEARED_EVENT,
  onStorageChange,
  readJsonResult,
} from '../../functions/storage';
import { utf8ByteLength } from '../../functions/textSize';

const STORAGE_KEY = 'mb_saved_inputs';
const MAX_NAME_LENGTH = 80;

interface SavedInput {
  id: string;
  name: string;
  input: string;
}

function isSavedInput(value: unknown): value is SavedInput {
  if (value === null || typeof value !== 'object') return false;
  const { id, name, input } = value as Partial<SavedInput>;
  return (
    typeof id === 'string' &&
    typeof name === 'string' &&
    name.trim() !== '' &&
    name.length <= MAX_NAME_LENGTH &&
    typeof input === 'string' &&
    canSave(input)
  );
}

function canSave(input: string): boolean {
  return (
    input.trim() !== '' &&
    utf8ByteLength(input) <= MAX_INPUT_DRAFT_BYTES &&
    !isPrivateInput(input)
  );
}

function readSavedInputs(): { items: SavedInput[]; needsCleanup: boolean } {
  const result = readJsonResult(
    STORAGE_KEY,
    (value): value is { version: 1; items: unknown[] } => {
      if (value === null || typeof value !== 'object') return false;
      const record = value as { version?: unknown; items?: unknown };
      return record.version === 1 && Array.isArray(record.items);
    },
  );
  if (result.status === 'unavailable')
    throw new Error('Saved input storage is unavailable');
  if (result.status !== 'ok') return { items: [], needsCleanup: false };
  const items = result.value.items.filter(isSavedInput);
  return { items, needsCleanup: items.length !== result.value.items.length };
}

function writeSavedInputs(items: SavedInput[]) {
  const storage = getLocalStorage();
  if (!storage) throw new Error('Saved input storage is unavailable');
  storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, items }));
}

export default function SavedInputs({
  input,
  onLoad,
}: {
  input: string;
  onLoad: (value: string) => void;
}) {
  const { t } = useLocale();
  const [items, setItems] = useState<SavedInput[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [storageError, setStorageError] = useState(false);
  const editing = items.find((item) => item.id === editingId);
  const savable = canSave(input);

  useEffect(() => {
    const refresh = () => {
      try {
        const { items, needsCleanup } = readSavedInputs();
        setItems(items);
        if (needsCleanup) writeSavedInputs(items);
        setStorageError(false);
      } catch {
        setStorageError(true);
      }
    };
    refresh();
    const unsubscribe = onStorageChange(STORAGE_KEY, refresh);
    window.addEventListener(LOCAL_DATA_CLEARED_EVENT, refresh);
    return () => {
      unsubscribe();
      window.removeEventListener(LOCAL_DATA_CLEARED_EVENT, refresh);
    };
  }, []);

  const updateItems = (
    update: (current: SavedInput[]) => SavedInput[],
  ): boolean => {
    try {
      const next = update(readSavedInputs().items);
      writeSavedInputs(next);
      setItems(next);
      setStorageError(false);
      return true;
    } catch {
      setStorageError(true);
      return false;
    }
  };

  const endEdit = () => {
    setEditingId(null);
    setName('');
  };

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const label = name.trim();
    if (label === '') return;
    if (editingId !== null) {
      if (
        updateItems((current) =>
          current.map((item) =>
            item.id === editingId ? { ...item, name: label } : item,
          ),
        )
      )
        endEdit();
    } else if (canSave(input)) {
      const id =
        globalThis.crypto?.randomUUID?.() ??
        `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      if (updateItems((current) => [{ id, name: label, input }, ...current]))
        endEdit();
    }
  };

  return (
    <section aria-label={t('savedInputs.title')} className="saved-inputs">
      <strong>{t('savedInputs.title')}</strong>
      {items.map((item) => (
        <div className="saved-input-row" key={item.id}>
          <button
            className="history-item-btn"
            onClick={() => onLoad(item.input)}
            type="button"
          >
            <span className="history-item-input">{item.name}</span>
          </button>
          <button
            aria-label={t('savedInputs.renameLabel', { name: item.name })}
            className="btn-subtle"
            onClick={() => {
              setEditingId(item.id);
              setName(item.name);
            }}
            type="button"
          >
            {t('savedInputs.rename')}
          </button>
          <button
            aria-label={t('savedInputs.deleteLabel', { name: item.name })}
            className="btn-subtle"
            onClick={() => {
              if (
                updateItems((current) =>
                  current.filter((entry) => entry.id !== item.id),
                ) &&
                editingId === item.id
              )
                endEdit();
            }}
            type="button"
          >
            {t('savedInputs.delete')}
          </button>
        </div>
      ))}
      <form className="saved-input-row" onSubmit={save}>
        <input
          aria-label={t('savedInputs.name')}
          disabled={!editing && !savable}
          maxLength={MAX_NAME_LENGTH}
          onChange={(event) => setName(event.currentTarget.value)}
          placeholder={t('savedInputs.name')}
          value={name}
        />
        <button
          className="btn-subtle"
          disabled={
            name.trim() === '' || (editingId !== null ? !editing : !savable)
          }
          type="submit"
        >
          {t(editing ? 'savedInputs.rename' : 'savedInputs.save')}
        </button>
        {editingId !== null ? (
          <button className="btn-subtle" onClick={endEdit} type="button">
            {t('savedInputs.cancel')}
          </button>
        ) : null}
      </form>
      {input.trim() && !savable && !editing ? (
        <p>{t('savedInputs.unavailableInput')}</p>
      ) : null}
      {storageError ? (
        <p role="alert">{t('savedInputs.storageError')}</p>
      ) : null}
    </section>
  );
}
