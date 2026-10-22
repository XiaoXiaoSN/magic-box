import { parseInput } from '@functions/parseOptions';
import type { BoxSource } from '@modules/BoxSource';
import { boxSources, sharedOptionOwners } from '@modules/boxSources';
import type * as React from 'react';
import {
  type ChangeEvent,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type RefObject,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useLocale } from '../../contexts/LocaleContext';
import { useOptionalSettings } from '../../contexts/SettingsContext';
import {
  getBoxSourceDisplay,
  type Locale,
  type Translations,
} from '../../i18n';

const MAX_VISIBLE_SUGGESTIONS = 8;

const VALUE_HINTS: Readonly<Record<string, string>> = {
  tz: '+8',
  timezone: '+8',
  locale: 'en',
  lang: 'en',
  l: 'en',
  wrap: '80',
  wordwrap: '80',
  iterations: '100000',
  dklen: '32',
  prf: 'sha256',
  format: 'known-format',
};

interface GlobalDirective {
  descriptionKey:
    | 'directiveAutocomplete.globalTimezone'
    | 'directiveAutocomplete.globalLocale';
  key: string;
}

const GLOBAL_DIRECTIVES: readonly GlobalDirective[] = [
  { key: 'tz', descriptionKey: 'directiveAutocomplete.globalTimezone' },
  {
    key: 'timezone',
    descriptionKey: 'directiveAutocomplete.globalTimezone',
  },
  { key: 'locale', descriptionKey: 'directiveAutocomplete.globalLocale' },
];

export interface DirectiveOwner {
  description: string;
  enabled: boolean;
  id: string;
  name: string;
}

export interface DirectiveCatalogEntry {
  hint: string | null;
  key: string;
  owners: readonly DirectiveOwner[];
}

export interface DirectiveChip {
  end: number;
  key: string;
  known: boolean;
  owners: readonly DirectiveOwner[];
  start: number;
  suggestion: string | null;
  value: string | boolean;
}

export interface DirectiveContext {
  end: number;
  key: string;
  lineStart: number;
  query: string;
  start: number;
}

interface DirectiveAutocompleteProps
  extends Omit<
    React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    'onChange' | 'value' | 'ref'
  > {
  onChange: (value: string) => void;
  onReplace: (value: string, caret: number) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
}

interface DirectiveOwnerInput {
  description: string;
  id: string;
  name: string;
}

const GLOBAL_OWNER_ID = 'directive-global';

const normalizedKey = (key: string): string => key.toLowerCase();

const getSourceId = (source: BoxSource): string => source.id ?? source.name;

const getOwnerName = (
  source: BoxSource,
  locale: Locale,
): DirectiveOwnerInput => {
  const display = getBoxSourceDisplay(source, locale);
  return {
    description: display.description,
    id: getSourceId(source),
    name: display.name,
  };
};

const getHint = (key: string): string | null => VALUE_HINTS[key] ?? null;

const createOwner = (
  owner: DirectiveOwnerInput,
  enabledSourceIds: ReadonlySet<string> | null,
): DirectiveOwner => ({
  ...owner,
  enabled:
    enabledSourceIds === null || owner.id === GLOBAL_OWNER_ID
      ? true
      : enabledSourceIds.has(owner.id),
});

const applyCatalogSettings = (
  catalog: readonly DirectiveCatalogEntry[],
  enabledSourceIds: ReadonlySet<string> | null,
): DirectiveCatalogEntry[] =>
  catalog.map((entry) => ({
    ...entry,
    owners: entry.owners.map((owner) => ({
      ...owner,
      enabled:
        enabledSourceIds === null || owner.id === GLOBAL_OWNER_ID
          ? true
          : enabledSourceIds.has(owner.id),
    })),
  }));

/** Builds the directive UI catalog from lazy source metadata without loading source implementations. */
export const buildDirectiveCatalog = (
  locale: Locale,
  sources: readonly BoxSource[] = boxSources,
  enabledSourceIds: ReadonlySet<string> | null = null,
  globalDescription: (key: GlobalDirective['descriptionKey']) => string = (
    key,
  ) => key,
): DirectiveCatalogEntry[] => {
  const ownersByKey = new Map<string, DirectiveOwnerInput[]>();

  for (const source of sources) {
    const owner = getOwnerName(source, locale);
    for (const rawKey of source.optionKeys ?? []) {
      const key = normalizedKey(rawKey);
      const owners = ownersByKey.get(key) ?? [];
      if (!owners.some((candidate) => candidate.id === owner.id)) {
        owners.push(owner);
      }
      ownersByKey.set(key, owners);
    }
  }

  for (const [key, ownerIds] of Object.entries(sharedOptionOwners)) {
    const owners = ownersByKey.get(key) ?? [];
    for (const ownerId of ownerIds) {
      const source = sources.find(
        (candidate) => getSourceId(candidate) === ownerId,
      );
      if (!source) continue;
      const owner = getOwnerName(source, locale);
      if (!owners.some((candidate) => candidate.id === owner.id)) {
        owners.push(owner);
      }
    }
    ownersByKey.set(key, owners);
  }

  for (const global of GLOBAL_DIRECTIVES) {
    const owners = ownersByKey.get(global.key) ?? [];
    const description = globalDescription(global.descriptionKey);
    if (!owners.some((owner) => owner.id === GLOBAL_OWNER_ID)) {
      owners.push({ description, id: GLOBAL_OWNER_ID, name: description });
    }
    ownersByKey.set(global.key, owners);
  }

  return [...ownersByKey.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, owners]) => ({
      hint: getHint(key),
      key,
      owners: owners.map((owner) => createOwner(owner, enabledSourceIds)),
    }));
};

const subsequenceScore = (query: string, value: string): number | null => {
  let queryIndex = 0;
  let score = 0;
  let previousIndex = -1;
  for (
    let index = 0;
    index < value.length && queryIndex < query.length;
    index += 1
  ) {
    if (value[index] !== query[queryIndex]) continue;
    score += previousIndex + 1 === index ? 2 : 1;
    previousIndex = index;
    queryIndex += 1;
  }
  return queryIndex === query.length ? score : null;
};

/** Ranks prefix matches first, then bounded substring and subsequence matches. */
export const filterDirectiveCatalog = (
  catalog: readonly DirectiveCatalogEntry[],
  query: string,
  limit = MAX_VISIBLE_SUGGESTIONS,
): DirectiveCatalogEntry[] => {
  const normalizedQuery = query.toLowerCase();
  if (normalizedQuery === '') return catalog.slice(0, limit);

  return catalog
    .map((entry, sourceIndex) => {
      const key = entry.key.toLowerCase();
      const prefix = key.startsWith(normalizedQuery);
      const substring = key.includes(normalizedQuery);
      const sequence = subsequenceScore(normalizedQuery, key);
      if (!prefix && !substring && sequence === null) return null;
      const score = prefix
        ? 300 - key.length
        : substring
          ? 200 - key.indexOf(normalizedQuery)
          : 100 + (sequence ?? 0);
      return { entry, score, sourceIndex };
    })
    .filter(
      (
        candidate,
      ): candidate is {
        entry: DirectiveCatalogEntry;
        score: number;
        sourceIndex: number;
      } => candidate !== null,
    )
    .sort(
      (left, right) =>
        right.score - left.score || left.sourceIndex - right.sourceIndex,
    )
    .slice(0, limit)
    .map(({ entry }) => entry);
};

const directiveLine = (
  value: string,
  caret: number,
): { end: number; lineStart: number } => {
  const lineStart = value.lastIndexOf('\n', Math.max(0, caret - 1)) + 1;
  const newline = value.indexOf('\n', caret);
  return {
    end: newline === -1 ? value.length : newline,
    lineStart,
  };
};

/** Returns the editable directive range at the current collapsed textarea caret. */
export const getDirectiveContext = (
  value: string,
  selectionStart: number | null,
  selectionEnd: number | null,
): DirectiveContext | null => {
  if (
    selectionStart === null ||
    selectionEnd === null ||
    selectionStart !== selectionEnd
  ) {
    return null;
  }

  const { end, lineStart } = directiveLine(value, selectionStart);
  const line = value.slice(lineStart, end);
  if (!/^::(?:[A-Za-z_][A-Za-z0-9_-]*)?$/.test(line)) return null;

  const key = line.slice(2);
  const caretInLine = selectionStart - lineStart;
  if (caretInLine < 2 || caretInLine > line.length) return null;

  // reuse the runtime tokenizer so IPv6 payloads never open the menu. The
  // legacy ca and dd aliases intentionally remain directives there.
  const [, options] = parseInput(line);
  if (key !== '' && Object.keys(options ?? {}).length === 0) return null;

  return {
    end: lineStart + 2 + key.length,
    key: normalizedKey(key),
    lineStart,
    query: key.slice(0, caretInLine - 2),
    start: lineStart + 2,
  };
};

const suggestDirective = (
  key: string,
  catalog: readonly DirectiveCatalogEntry[],
): string | null => filterDirectiveCatalog(catalog, key, 1)[0]?.key ?? null;

const parseDirectiveChips = (
  value: string,
  catalog: readonly DirectiveCatalogEntry[],
): DirectiveChip[] => {
  const entriesByKey = new Map(catalog.map((entry) => [entry.key, entry]));
  const lastByKey = new Map<string, DirectiveChip>();

  for (let lineStart = 0; lineStart <= value.length; ) {
    let lineEnd = lineStart;
    while (lineEnd < value.length) {
      const character = value[lineEnd];
      if (character === '\n' || character === '\r') break;
      lineEnd += 1;
    }
    const line = value.slice(lineStart, lineEnd);
    const parsed = parseInput(line);
    const parsedEntries = Object.entries(parsed[1] ?? {});
    const match = /^::([A-Za-z_][A-Za-z0-9_-]*)/.exec(line);
    if (match && parsedEntries.length > 0) {
      const key = normalizedKey(match[1]);
      const entry = entriesByKey.get(key);
      const valueForChip = parsed[1]?.[key] ?? true;
      const suggestion = entry ? null : suggestDirective(key, catalog);
      lastByKey.set(key, {
        end: lineStart + match[0].length,
        key,
        known: entry !== undefined,
        owners: entry?.owners ?? [],
        start: lineStart + 2,
        suggestion,
        value: valueForChip,
      });
    }

    if (lineEnd === value.length) break;
    lineStart =
      value[lineEnd] === '\r' && value[lineEnd + 1] === '\n'
        ? lineEnd + 2
        : lineEnd + 1;
  }

  return [...lastByKey.values()];
};

const sourceIdsFromSettings = (
  settings: ReturnType<typeof useOptionalSettings>,
): ReadonlySet<string> | null => {
  if (!settings) return null;
  return new Set(
    Object.values(settings.settings.boxes)
      .filter((setting) => setting.enabled)
      .map((setting) => setting.id),
  );
};

const getTranslation = (
  t: (
    key: keyof Translations,
    params?: Record<string, string | number>,
  ) => string,
  key: keyof Translations,
  params?: Record<string, string | number>,
): string => t(key, params);

export const DirectiveChips = ({
  input,
  onReplace,
}: {
  input: string;
  onReplace: (value: string, caret: number) => void;
}): React.JSX.Element | null => {
  const { locale, t } = useLocale();
  const settings = useOptionalSettings();
  const enabledSourceIds = useMemo(
    () => sourceIdsFromSettings(settings),
    [settings],
  );
  const metadataCatalog = useMemo(
    () =>
      buildDirectiveCatalog(locale, boxSources, null, (key) =>
        getTranslation(t, key),
      ),
    [locale, t],
  );
  const catalog = useMemo(
    () => applyCatalogSettings(metadataCatalog, enabledSourceIds),
    [enabledSourceIds, metadataCatalog],
  );
  const chips = useMemo(
    () => parseDirectiveChips(input, catalog),
    [catalog, input],
  );

  const enableOwner = useCallback(
    (id: string): void => {
      if (!settings || id === GLOBAL_OWNER_ID) return;
      const boxes = { ...settings.settings.boxes };
      const current = boxes[id];
      if (!current || current.enabled) return;
      settings.updateSettings({
        ...settings.settings,
        boxes: { ...boxes, [id]: { ...current, enabled: true } },
      });
    },
    [settings],
  );

  if (chips.length === 0) return null;

  return (
    <span className="input-options" data-testid="input-options">
      {chips.map((chip) => {
        const disabledOwners = chip.owners.filter((owner) => !owner.enabled);
        const suggestion = chip.suggestion;
        return (
          <span
            className={`opt-chip${chip.known ? '' : ' is-unknown'}`}
            data-testid={`directive-chip-${chip.key}`}
            key={chip.key}
          >
            <span className="opt-k">{chip.key}</span>
            {chip.value !== true && !isPrivateDirective(chip.key) ? (
              <>
                <span className="opt-eq">=</span>
                <span className="opt-v">{String(chip.value)}</span>
              </>
            ) : null}
            {!chip.known ? (
              <span className="opt-status">
                {getTranslation(t, 'directiveAutocomplete.unknown')}
                {suggestion ? (
                  <button
                    className="opt-suggestion"
                    onClick={() => {
                      const next =
                        input.slice(0, chip.start) +
                        suggestion +
                        input.slice(chip.end);
                      onReplace(next, chip.start + suggestion.length);
                    }}
                    type="button"
                  >
                    {getTranslation(t, 'directiveAutocomplete.suggestion', {
                      key: suggestion,
                    })}
                  </button>
                ) : null}
              </span>
            ) : disabledOwners.length > 0 ? (
              <span className="opt-status">
                {getTranslation(t, 'directiveAutocomplete.disabled')}
                {disabledOwners.map((owner) => (
                  <button
                    aria-label={getTranslation(
                      t,
                      'directiveAutocomplete.enableOwner',
                      { name: owner.name },
                    )}
                    className="opt-enable"
                    key={owner.id}
                    onClick={() => enableOwner(owner.id)}
                    type="button"
                  >
                    {owner.name}
                  </button>
                ))}
              </span>
            ) : null}
          </span>
        );
      })}
    </span>
  );
};

const isPrivateDirective = (key: string): boolean =>
  key === 'ai' || key === 'localai' || key === 'secret';

const DirectiveAutocomplete = ({
  textareaRef,
  value,
  onChange,
  onReplace,
  onBlur,
  onFocus,
  onClick,
  onKeyUp,
  ...textareaProps
}: DirectiveAutocompleteProps): React.JSX.Element => {
  const { locale, t } = useLocale();
  const [selection, setSelection] = useState({ end: 0, start: 0 });
  const [activeIndex, setActiveIndex] = useState(0);
  const [composing, setComposing] = useState(false);
  const [menuDismissed, setMenuDismissed] = useState(false);
  const acceptedQueryRef = useRef<string | null>(null);
  const reactId = useId();
  const listId = `directive-list-${reactId.replace(/:/g, '')}`;
  const settings = useOptionalSettings();
  const enabledSourceIds = useMemo(
    () => sourceIdsFromSettings(settings),
    [settings],
  );
  const metadataCatalog = useMemo(
    () =>
      buildDirectiveCatalog(locale, boxSources, null, (key) =>
        getTranslation(t, key),
      ),
    [locale, t],
  );
  const catalog = useMemo(
    () => applyCatalogSettings(metadataCatalog, enabledSourceIds),
    [enabledSourceIds, metadataCatalog],
  );
  const context = useMemo(
    () => getDirectiveContext(value, selection.start, selection.end),
    [selection.end, selection.start, value],
  );
  const suggestions = useMemo(
    () =>
      context && !composing && !menuDismissed
        ? filterDirectiveCatalog(catalog, context.query)
        : [],
    [catalog, composing, context, menuDismissed],
  );
  const menuOpen = context !== null && suggestions.length > 0;
  const selectedIndex = menuOpen
    ? Math.min(activeIndex, suggestions.length - 1)
    : -1;
  const activeOption = selectedIndex >= 0 ? suggestions[selectedIndex] : null;
  const contextQuery = context?.query ?? null;

  useEffect(() => {
    setActiveIndex(0);
    if (contextQuery === acceptedQueryRef.current) {
      acceptedQueryRef.current = null;
      setMenuDismissed(true);
      return;
    }
    setMenuDismissed(false);
  }, [contextQuery]);

  const syncSelection = useCallback((target: HTMLTextAreaElement): void => {
    setSelection({ end: target.selectionEnd, start: target.selectionStart });
    setMenuDismissed(false);
  }, []);

  const accept = useCallback(
    (entry: DirectiveCatalogEntry): void => {
      if (!context) return;
      const replacement =
        value.slice(0, context.start) + entry.key + value.slice(context.end);
      acceptedQueryRef.current = entry.key;
      onReplace(replacement, context.start + entry.key.length);
      setMenuDismissed(true);
    },
    [context, onReplace, value],
  );

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>): void => {
    syncSelection(event.currentTarget);
    onChange(event.currentTarget.value);
  };

  const handleFocus = (event: FocusEvent<HTMLTextAreaElement>): void => {
    syncSelection(event.currentTarget);
    onFocus?.(event);
  };

  const handleClick = (event: MouseEvent<HTMLTextAreaElement>): void => {
    syncSelection(event.currentTarget);
    onClick?.(event);
  };

  const handleKeyUp = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    setSelection({
      end: event.currentTarget.selectionEnd,
      start: event.currentTarget.selectionStart,
    });
    if (
      event.key !== 'Escape' &&
      event.key !== 'Enter' &&
      event.key !== 'Tab'
    ) {
      setMenuDismissed(false);
    }
    onKeyUp?.(event);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (menuOpen && !event.nativeEvent.isComposing) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((index) => (index + 1) % suggestions.length);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex(
          (index) => (index - 1 + suggestions.length) % suggestions.length,
        );
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        setMenuDismissed(true);
        return;
      }
      if (event.key === 'Tab' || event.key === 'Enter') {
        event.preventDefault();
        if (activeOption) accept(activeOption);
        return;
      }
    }
    textareaProps.onKeyDown?.(event);
  };

  const handleCompositionStart = (
    event: React.CompositionEvent<HTMLTextAreaElement>,
  ): void => {
    setComposing(true);
    setMenuDismissed(true);
    textareaProps.onCompositionStart?.(event);
  };

  const handleCompositionEnd = (
    event: React.CompositionEvent<HTMLTextAreaElement>,
  ): void => {
    setComposing(false);
    syncSelection(event.currentTarget);
    textareaProps.onCompositionEnd?.(event);
  };

  const announcement = menuOpen
    ? getTranslation(t, 'directiveAutocomplete.count', {
        count: suggestions.length,
      })
    : getTranslation(t, 'directiveAutocomplete.noSuggestions');

  return (
    <div className="directive-autocomplete">
      <textarea
        {...textareaProps}
        aria-activedescendant={
          activeOption ? `${listId}-${activeOption.key}` : undefined
        }
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={menuOpen}
        role="combobox"
        onBlur={onBlur}
        onChange={handleChange}
        onClick={handleClick}
        onCompositionEnd={handleCompositionEnd}
        onCompositionStart={handleCompositionStart}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        ref={textareaRef}
        value={value}
      />
      {menuOpen ? (
        <div
          aria-label={getTranslation(t, 'directiveAutocomplete.listLabel')}
          className="directive-menu"
          id={listId}
          role="listbox"
        >
          {suggestions.map((entry, index) => (
            <div
              aria-selected={index === selectedIndex}
              className={
                'directive-option' +
                (index === selectedIndex ? ' is-active' : '')
              }
              id={`${listId}-${entry.key}`}
              key={entry.key}
              onClick={() => accept(entry)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  accept(entry);
                }
              }}
              onMouseDown={(event) => event.preventDefault()}
              role="option"
              tabIndex={-1}
            >
              <span className="directive-option-main">
                <code>
                  ::{entry.key}
                  {entry.hint ? `=${entry.hint}` : ''}
                </code>
                <span>
                  {entry.owners.map((owner) => owner.name).join(' / ')}
                </span>
              </span>
              <span className="directive-option-description">
                {entry.owners[0]?.description ?? ''}
              </span>
            </div>
          ))}
        </div>
      ) : null}
      <div aria-live="polite" className="directive-announcement">
        {context && !composing ? announcement : ''}
      </div>
    </div>
  );
};

export default DirectiveAutocomplete;
