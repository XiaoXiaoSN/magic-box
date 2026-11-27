import { retryableLazy } from '@components/ErrorBoundary';
import CustomizedSnackbar, {
  type SnackbarNotification,
} from '@components/Snackbar';
import copyTextToClipboard from '@functions/clipboard';
import { trim } from '@functions/helper';
import { isLocalAIPrivate, isPrivateInput } from '@functions/localAIPrivacy';
import { parseInput } from '@functions/parseOptions';
import { type Box as BoxType, errorBox } from '@modules/Box';
import type { BoxSource, BoxSourceContext } from '@modules/BoxSource';
import {
  ComputeWorkerClient,
  type ComputeWorkerRunHandle,
} from '@modules/computeWorker/client';
import { MAX_WORKER_INPUT_LENGTH } from '@modules/computeWorker/dto';
import React, {
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { FeedbackCandidate } from '../../../functions/schema.js';
import { useIsBoxPreview } from '../../contexts/BoxPreviewContext';
import { useLocale } from '../../contexts/LocaleContext';
import { usePreferences } from '../../contexts/PreferencesContext';
import { useSettings } from '../../contexts/SettingsContext';
import BoxCard from './BoxCard';
import BoxModal from './BoxModal';

const FeedbackPanel = retryableLazy(
  () => import('../../features/feedback/FeedbackPanel'),
);

const WORKER_AUTO_INPUT_LIMIT = 256 * 1024;

function decorateBoxes(boxes: BoxType[], source: BoxSource): BoxType[] {
  return boxes.map((box) => ({
    ...box,
    props: {
      ...box.props,
      tag: box.props.tag ?? source.tag,
      kind: box.props.kind ?? source.kind,
    },
  }));
}

function sourceErrorBox(source: BoxSource, message: string): BoxType {
  return errorBox(source.name, message);
}

function hasExplicitSourceOption(
  source: BoxSource,
  options: Record<string, string | boolean> | null,
): boolean {
  return (
    options !== null &&
    source.optionKeys?.some((key) => Object.hasOwn(options, key)) === true
  );
}

interface Props {
  input: string;
  liveInput?: string;
  sources?: BoxSource[];
  onPasteInput?: (value: string) => void;
  onInputCommit?: (input: string) => void;
  resetTrigger?: number;
}

type RunState = 'idle' | 'pending' | 'settled';

interface BoxResult {
  id: symbol;
  box: BoxType;
}

type SourceKey = string | BoxSource;

interface RunKey {
  feedbackContextKey: string;
  preview: boolean;
}

interface SourceResultSlot {
  source: BoxSource;
  key: number;
  results: BoxResult[];
  runKey: RunKey;
  reusable: boolean;
}

const getSourceKey = (source: BoxSource): SourceKey => source.id ?? source;

function getSourceSlot(
  results: ReadonlyMap<SourceKey, SourceResultSlot>,
  source: BoxSource,
): SourceResultSlot | undefined {
  const slot = results.get(getSourceKey(source));
  return slot?.source === source ? slot : undefined;
}

interface BoxEntry extends BoxResult {
  sourceId: string;
  key: string;
  stale: boolean;
}

interface KeyboardState {
  copyMode: 'enter' | 'paste' | 'off';
  entries: BoxEntry[];
  selectedKey: string | null;
}

const EmptyState = ({ input }: { input: string }): React.JSX.Element => {
  const { t } = useLocale();
  if (trim(input) === '') {
    return (
      <div className="empty" data-testid="magic-box-empty">
        <div aria-hidden="true" className="empty-mark" />
        <div className="empty-title">{t('magicBox.emptyStartTitle')}</div>
      </div>
    );
  }
  return (
    <div className="empty" data-testid="magic-box-empty">
      <div aria-hidden="true" className="empty-mark" />
      <div className="empty-title">{t('magicBox.emptyNoMatchesTitle')}</div>
      <div className="empty-sub">{t('magicBox.emptyNoMatchesSub')}</div>
    </div>
  );
};

const PendingState = (): React.JSX.Element => {
  const { t } = useLocale();
  return (
    <div aria-live="polite" className="empty" data-testid="magic-box-pending">
      <div aria-hidden="true" className="empty-mark" />
      <div className="empty-title">{t('magicBox.loading')}</div>
    </div>
  );
};

const MagicBox = ({
  input: magicIn,
  liveInput,
  sources,
  onPasteInput,
  onInputCommit,
  resetTrigger,
}: Props): React.JSX.Element => {
  const [notify, setNotify] = useState<SnackbarNotification | null>(null);
  const [sourceResults, setSourceResults] = useState(
    () => new Map<SourceKey, SourceResultSlot>(),
  );
  const readSourceResults = useEffectEvent(() => sourceResults);
  const nextSourceSlotKey = useRef(0);
  const [runState, setRunState] = useState<RunState>('idle');
  const [feedbackSettled, setFeedbackSettled] = useState<{
    key: string;
    sources: BoxSource[];
  } | null>(null);
  const [modalResultId, setModalResultId] = useState<symbol | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const itemRefs = useRef<Map<string, HTMLElement | null>>(new Map());
  const itemRefCallbacks = useRef<
    Map<string, (element: HTMLElement | null) => void>
  >(new Map());
  const copySequence = useRef(0);
  const notificationId = useRef(0);
  const runIdRef = useRef(0);
  const onPasteInputRef = useRef(onPasteInput);
  const workerClientRef = useRef<ComputeWorkerClient | null>(null);
  const onInputCommitRef = useRef(onInputCommit);
  const currentInputRef = useRef('');
  const copyKeyRef = useRef('');
  const { filteredBoxSources } = useSettings();
  const { prefs } = usePreferences();
  const { copyMode } = prefs;
  const { locale, t } = useLocale();
  const preview = useIsBoxPreview();

  onPasteInputRef.current = onPasteInput;
  onInputCommitRef.current = onInputCommit;

  const isStale = liveInput !== undefined && liveInput !== magicIn;
  const displayInput = liveInput ?? magicIn;
  const feedbackContextKey = JSON.stringify([
    magicIn,
    locale,
    prefs.timezoneMode,
    prefs.timezoneOffset,
  ]);
  const currentRunKey = useMemo(
    (): RunKey => ({ feedbackContextKey, preview }),
    [feedbackContextKey, preview],
  );
  const activeSources = sources ?? filteredBoxSources;
  const copyKey = `${preview ? 'preview' : 'live'}:${magicIn}:${displayInput}`;
  if (copyKeyRef.current !== copyKey) {
    copyKeyRef.current = copyKey;
    copySequence.current += 1;
  }
  currentInputRef.current = displayInput;

  const boxEntries = useMemo<BoxEntry[]>(() => {
    const entries: BoxEntry[] = [];
    for (const source of activeSources) {
      const slot = getSourceSlot(sourceResults, source);
      if (!slot) continue;
      const seenNames = new Map<string, number>();
      slot.results.forEach(({ id, box }) => {
        const name = box.props.name || 'box';
        const occurrence = seenNames.get(name) ?? 0;
        seenNames.set(name, occurrence + 1);
        entries.push({
          id,
          sourceId: source.id ?? source.name,
          box,
          key: `${slot.key}:${name}:${occurrence}`,
          stale: isStale || slot.runKey !== currentRunKey,
        });
      });
    }
    return entries;
  }, [activeSources, currentRunKey, isStale, sourceResults]);

  const boxes = useMemo(() => boxEntries.map(({ box }) => box), [boxEntries]);
  const modalBox =
    modalResultId === null
      ? null
      : (boxEntries.find(({ id, stale }) => id === modalResultId && !stale)
          ?.box ?? null);
  const modalIsActive = modalBox !== null;
  const selectableEntries = useMemo(
    () => boxEntries.filter(({ stale }) => !stale),
    [boxEntries],
  );
  const selectedIndex = useMemo(
    () =>
      selectedKey === null
        ? -1
        : boxEntries.findIndex(
            ({ key, stale }) => key === selectedKey && !stale,
          ),
    [boxEntries, selectedKey],
  );

  const latestKeyboardState = useRef<KeyboardState>({
    copyMode,
    entries: [],
    selectedKey: null,
  });
  latestKeyboardState.current = {
    copyMode,
    entries: selectableEntries,
    selectedKey,
  };

  useEffect(() => {
    return () => {
      copySequence.current += 1;
      workerClientRef.current?.release();
      workerClientRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (resetTrigger !== undefined) {
      setSelectedKey(null);
    }
  }, [resetTrigger]);

  const copyText = useCallback(
    async (text: string, resultId: symbol): Promise<boolean> => {
      const sequence = ++copySequence.current;
      const copyKeyAtStart = copyKeyRef.current;
      let copied = false;

      if (text) {
        try {
          copied = (await copyTextToClipboard(text)) === true;
        } catch {
          copied = false;
        }
      }

      if (
        sequence !== copySequence.current ||
        copyKeyRef.current !== copyKeyAtStart ||
        !latestKeyboardState.current.entries.some(({ id }) => id === resultId)
      ) {
        return false;
      }
      setNotify({
        id: ++notificationId.current,
        severity: copied ? 'success' : 'error',
      });
      return copied;
    },
    [],
  );

  const copyModalText = useCallback(
    (text: string): Promise<boolean> =>
      modalResultId === null
        ? Promise.resolve(false)
        : copyText(text, modalResultId),
    [copyText, modalResultId],
  );

  const handleInputCommit = useCallback((): void => {
    onInputCommitRef.current?.(currentInputRef.current);
  }, []);

  const handleOpenModal = useCallback(
    (resultId: symbol): void => {
      if (!isStale) setModalResultId(resultId);
    },
    [isStale],
  );

  const handleCloseModal = useCallback((): void => {
    setModalResultId(null);
  }, []);

  useEffect(() => {
    setFeedbackSettled(null);
    const controller = new AbortController();
    const runId = ++runIdRef.current;

    if (trim(magicIn) === '') {
      setSourceResults(new Map());
      setRunState('idle');
      setSelectedKey(null);
      setModalResultId(null);
      return () => {
        controller.abort();
        if (runIdRef.current === runId) runIdRef.current += 1;
      };
    }

    const [input, options] = parseInput(magicIn);
    const runtimeLocale = locale === 'tw' ? 'zh_TW' : 'en';
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const timezoneOffset = prefs.timezoneOffset;
    const timezoneMode = prefs.timezoneMode;
    const now = Date.now();
    const context: BoxSourceContext = {
      preview,
      signal: controller.signal,
      now,
      locale: runtimeLocale,
      timezone,
      timezoneOffset,
      timezoneMode,
    };
    const previousResults = readSourceResults();
    const slotKeys = new Map<BoxSource, number>();
    const sourcesToRun: BoxSource[] = [];
    for (const source of activeSources) {
      const slot = getSourceSlot(previousResults, source);
      slotKeys.set(source, slot?.key ?? nextSourceSlotKey.current++);
      // Keep successful results for the same context while new sources load.
      if (slot?.runKey !== currentRunKey || !slot.reusable) {
        sourcesToRun.push(source);
      }
    }
    // Apply to queued template updates as well as the last rendered snapshot.
    setSourceResults(
      (current) =>
        new Map([...current].filter(([, slot]) => slotKeys.has(slot.source))),
    );
    setRunState('pending');

    const commitSlot = (
      source: BoxSource,
      generated: BoxType[],
      reusable = true,
    ): void => {
      if (controller.signal.aborted || runIdRef.current !== runId) return;
      const key = slotKeys.get(source);
      if (key === undefined) return;
      const slot: SourceResultSlot = {
        source,
        key,
        results: generated.map((box) => ({ id: Symbol(), box })),
        runKey: currentRunKey,
        reusable,
      };
      setSourceResults((current) => {
        if (controller.signal.aborted || runIdRef.current !== runId) {
          return current;
        }
        return new Map(current).set(getSourceKey(source), slot);
      });
    };

    const largeInput = input.length > WORKER_AUTO_INPUT_LIMIT;
    const workerSources = new Map<string, BoxSource>();
    const mainSources: BoxSource[] = [];

    for (const boxSource of sourcesToRun) {
      const sourceId = boxSource.id;
      const matches = boxSource.canHandle?.(input, options) ?? true;
      const explicitlyRequested = hasExplicitSourceOption(boxSource, options);
      const supportsInputSize =
        !largeInput ||
        (explicitlyRequested &&
          boxSource.supportsLargeInput === true &&
          input.length <= MAX_WORKER_INPUT_LENGTH);
      const canUseWorker =
        supportsInputSize &&
        input.length <= MAX_WORKER_INPUT_LENGTH &&
        sourceId !== undefined &&
        boxSource.workerSafe === true &&
        matches;

      if (canUseWorker && sourceId !== undefined) {
        workerSources.set(sourceId, boxSource);
        continue;
      }

      if (boxSource.workerSafe === true && boxSource.canHandle && !matches) {
        commitSlot(boxSource, []);
        continue;
      }

      if (supportsInputSize) {
        mainSources.push(boxSource);
        continue;
      }

      if (explicitlyRequested) {
        const limit =
          input.length > MAX_WORKER_INPUT_LENGTH
            ? MAX_WORKER_INPUT_LENGTH
            : WORKER_AUTO_INPUT_LIMIT;
        commitSlot(
          boxSource,
          decorateBoxes(
            [
              sourceErrorBox(
                boxSource,
                `Input is too large for this source (limit ${limit} characters).`,
              ),
            ],
            boxSource,
          ),
        );
      } else {
        commitSlot(boxSource, []);
      }
    }

    const mainTasks = mainSources.map(async (source) => {
      try {
        const generated = await source.generateBoxes(input, options, context);
        if (controller.signal.aborted || runIdRef.current !== runId) return;
        commitSlot(source, decorateBoxes(generated, source));
      } catch (error) {
        if (controller.signal.aborted || runIdRef.current !== runId) return;
        console.error(`[MagicBox] boxSource "${source.name}" threw:`, error);
        commitSlot(source, [], false);
      }
    });

    const completedWorkerSources = new Set<string>();
    const reportWorkerError = (sourceId: string, message: string): void => {
      completedWorkerSources.add(sourceId);
      const source = workerSources.get(sourceId);
      if (!source) return;
      commitSlot(
        source,
        decorateBoxes([sourceErrorBox(source, message)], source),
        false,
      );
    };

    let workerHandle: ComputeWorkerRunHandle | null = null;
    if (workerSources.size > 0) {
      if (workerClientRef.current === null) {
        workerClientRef.current = new ComputeWorkerClient({
          createWorker: () =>
            new Worker(
              new URL(
                '../../modules/computeWorker/compute.worker.ts',
                import.meta.url,
              ),
              { type: 'module' },
            ),
        });
      }
      workerHandle = workerClientRef.current.run(
        {
          type: 'run',
          runId: `magic-box-${runId}`,
          input,
          options,
          sourceIds: [...workerSources.keys()],
          now,
          locale: runtimeLocale,
          timezone,
          timezoneOffset,
          timezoneMode,
        },
        {
          onSourceResult: (_workerRunId, sourceId, generated) => {
            completedWorkerSources.add(sourceId);
            const source = workerSources.get(sourceId);
            if (source) commitSlot(source, decorateBoxes(generated, source));
          },
          onSourceError: (_workerRunId, sourceId, message) => {
            reportWorkerError(sourceId, message);
          },
          onSourceLoadTimeout: (_workerRunId, sourceId) => {
            reportWorkerError(
              sourceId,
              'Worker source loading timed out before computation started.',
            );
          },
          onSourceTimeout: (_workerRunId, sourceId) => {
            reportWorkerError(sourceId, 'Worker computation timed out.');
          },
          onFailure: (_workerRunId, message) => {
            for (const sourceId of workerSources.keys()) {
              if (!completedWorkerSources.has(sourceId)) {
                reportWorkerError(sourceId, message);
              }
            }
          },
        },
      );
    }

    const tasks: Promise<unknown>[] = [...mainTasks];
    if (workerHandle !== null) {
      tasks.push(workerHandle.promise.catch(() => undefined));
    }

    void Promise.all(tasks).then(() => {
      if (!controller.signal.aborted && runIdRef.current === runId) {
        setRunState('settled');
        setFeedbackSettled({ key: feedbackContextKey, sources: activeSources });
      }
    });

    return () => {
      controller.abort();
      workerHandle?.cancel();
      if (runIdRef.current === runId) runIdRef.current += 1;
    };
  }, [
    activeSources,
    currentRunKey,
    feedbackContextKey,
    locale,
    magicIn,
    prefs.timezoneMode,
    prefs.timezoneOffset,
    preview,
  ]);

  useEffect(() => {
    if (selectedKey === null) return;
    const selectedEntry = boxEntries.find(({ key }) => key === selectedKey);
    if (!selectedEntry || selectedEntry.stale) {
      setSelectedKey(null);
    }
  }, [boxEntries, selectedKey]);

  useEffect(() => {
    if (!modalIsActive) setModalResultId(null);
  }, [modalIsActive]);

  useEffect(() => {
    if (selectedIndex < 0) return;
    const entry = boxEntries[selectedIndex];
    if (!entry || entry.stale) return;
    const element = entry ? itemRefs.current.get(entry.key) : null;
    if (element) {
      try {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } catch {
        /* noop */
      }
    }
  }, [boxEntries, selectedIndex]);

  const getItemRef = useCallback(
    (key: string): ((element: HTMLElement | null) => void) => {
      const current = itemRefCallbacks.current.get(key);
      if (current) return current;

      const callback = (element: HTMLElement | null): void => {
        if (element) {
          itemRefs.current.set(key, element);
        } else {
          itemRefs.current.delete(key);
        }
      };
      itemRefCallbacks.current.set(key, callback);
      return callback;
    },
    [],
  );

  const handleSelect = useCallback(
    (index: number): void => {
      if (isStale) return;
      const entry = boxEntries[index];
      if (!entry || entry.stale) return;
      setSelectedKey(entry.key);
    },
    [boxEntries, isStale],
  );

  const handleResultChange = useCallback(
    (
      resultId: symbol,
      result: Pick<BoxType['props'], 'options' | 'plaintextOutput'>,
    ): void => {
      setSourceResults((current) => {
        if (
          !latestKeyboardState.current.entries.some(({ id }) => id === resultId)
        ) {
          return current;
        }
        for (const [key, slot] of current) {
          const index = slot.results.findIndex(({ id }) => id === resultId);
          const entry = slot.results[index];
          if (!entry) continue;
          if (
            entry.box.props.plaintextOutput === result.plaintextOutput &&
            entry.box.props.options === result.options
          )
            return current;
          const results = slot.results.slice();
          results[index] = {
            ...entry,
            box: { ...entry.box, props: { ...entry.box.props, ...result } },
          };
          return new Map(current).set(key, { ...slot, results });
        }
        return current;
      });
    },
    [],
  );

  const handleModalResultChange = useCallback(
    (result: Pick<BoxType['props'], 'options' | 'plaintextOutput'>): void => {
      if (modalResultId !== null) handleResultChange(modalResultId, result);
    },
    [handleResultChange, modalResultId],
  );

  const pasteAsInput = useCallback((value: string): void => {
    const callback = onPasteInputRef.current;
    if (callback) {
      callback(value);
      return;
    }
    const input = document.querySelector(
      'input[name="magicInput"], textarea[name="magicInput"]',
    ) as HTMLInputElement | HTMLTextAreaElement | null;
    if (!input) return;
    input.focus();
    input.value = value;
    try {
      input.dispatchEvent(new Event('input', { bubbles: true }));
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent): void => {
      if (event.defaultPrevented || event.isComposing) return;

      const target = event.target instanceof Element ? event.target : null;
      const focusedElement =
        target ??
        (document.activeElement instanceof Element
          ? document.activeElement
          : null);
      const editable =
        target?.closest('textarea, input, select, [contenteditable="true"]') ??
        (focusedElement?.matches(
          'textarea, input, select, [contenteditable="true"]',
        )
          ? focusedElement
          : null);
      const isMainInput =
        focusedElement?.matches('textarea[data-magic-input="true"]') ?? false;
      if (editable && !isMainInput) return;

      const interactive = target?.closest('a, button, [role="button"]');
      if (interactive && !target?.matches('.box-card')) return;

      const inDialog = focusedElement?.closest(
        '[role="dialog"], .box-modal-root, .MuiModal-root',
      );
      if (inDialog) return;
      const isResultFocus = focusedElement?.closest('.box-card') !== null;
      const eventWasDispatchedOnWindow = !(event.target instanceof Element);
      if (!isMainInput && !isResultFocus && !eventWasDispatchedOnWindow) {
        return;
      }

      const state = latestKeyboardState.current;
      if (state.entries.length === 0) return;

      const isCtrl = event.ctrlKey || event.metaKey;
      const selectedPosition = state.entries.findIndex(
        ({ key }) => key === state.selectedKey,
      );
      const selected = state.entries[selectedPosition];

      if (
        event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        (event.key === 'ArrowDown' ||
          event.key === 'ArrowUp' ||
          event.key === 'Home' ||
          event.key === 'End')
      ) {
        event.preventDefault();
        setSelectedKey(() => {
          if (event.key === 'Home') return state.entries[0]?.key ?? null;
          if (event.key === 'End') {
            return state.entries.at(-1)?.key ?? null;
          }
          if (selectedPosition < 0) {
            return event.key === 'ArrowUp'
              ? (state.entries.at(-1)?.key ?? null)
              : (state.entries[0]?.key ?? null);
          }
          const next =
            event.key === 'ArrowUp'
              ? selectedPosition - 1
              : selectedPosition + 1;
          return state.entries[
            Math.max(0, Math.min(state.entries.length - 1, next))
          ]?.key;
        });
        return;
      }

      if (event.key === 'Enter' && isCtrl) {
        event.preventDefault();
        event.stopPropagation();
        if (!selected) return;

        const stdout = selected.box.props.plaintextOutput ?? '';
        if (stdout) {
          const inputSnapshot = currentInputRef.current;
          void copyText(stdout, selected.id)
            .then((copied) => {
              if (!copied) return;
              onInputCommitRef.current?.(inputSnapshot);
              pasteAsInput(stdout);
            })
            .catch(() => undefined);
          selected.box.props.onClick(stdout);
        }
        return;
      }

      if (isCtrl && (event.key === 'n' || event.key === 'N')) {
        setSelectedKey((previous) => {
          const previousPosition = state.entries.findIndex(
            ({ key }) => key === previous,
          );
          const next = event.shiftKey
            ? previousPosition - 1
            : previousPosition + 1;
          if (next < 0) return state.entries[0]?.key ?? null;
          if (next >= state.entries.length) {
            return state.entries[state.entries.length - 1]?.key ?? null;
          }
          return state.entries[next]?.key ?? null;
        });
        return;
      }

      if (
        event.ctrlKey &&
        !event.metaKey &&
        (event.key === 'p' || event.key === 'P')
      ) {
        event.preventDefault();
        setSelectedKey((previous) => {
          const previousPosition = state.entries.findIndex(
            ({ key }) => key === previous,
          );
          const next = Math.max(previousPosition - 1, 0);
          return state.entries[next]?.key ?? null;
        });
        return;
      }

      if (
        event.key !== 'Enter' ||
        isCtrl ||
        state.copyMode === 'off' ||
        (!isMainInput && !isResultFocus && !eventWasDispatchedOnWindow)
      )
        return;
      if (!selected) return;

      const tag = target?.tagName?.toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA') {
        event.preventDefault();
        event.stopPropagation();
      }

      const stdout = selected.box.props.plaintextOutput ?? '';
      if (!stdout) return;
      const inputSnapshot = currentInputRef.current;
      void copyText(stdout, selected.id)
        .then((copied) => {
          if (!copied) return;
          onInputCommitRef.current?.(inputSnapshot);
          if (state.copyMode === 'paste') pasteAsInput(stdout);
        })
        .catch(() => undefined);
      selected.box.props.onClick(stdout);
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // the handler reads refs so this listener is registered once per mount.
  }, [copyText, pasteAsInput]);

  const renderedBoxes = boxEntries.map(({ id, box, key, stale }, index) => (
    <BoxCard
      key={key}
      ref={getItemRef(key)}
      box={box}
      index={index}
      onCopy={copyText}
      onInputCommit={handleInputCommit}
      onExpand={
        box.props.showExpandButton !== false ? handleOpenModal : undefined
      }
      onResultChange={handleResultChange}
      onSelect={handleSelect}
      resultId={id}
      selectionTabIndex={
        selectedIndex >= 0
          ? index === selectedIndex
            ? 0
            : -1
          : index === 0
            ? 0
            : -1
      }
      selected={!stale && index === selectedIndex}
      stale={stale}
    />
  ));

  const pending =
    runState === 'pending' || (isStale && trim(displayInput) !== '');
  const feedbackCandidates: FeedbackCandidate[] = prefs.collectFeedback
    ? boxEntries
        .filter(({ stale }) => !stale)
        .map(({ box, key, sourceId }) => ({
          id: key,
          sourceId,
          name: box.props.name || 'box',
          output: box.props.plaintextOutput,
          isError: box.props.isError === true,
        }))
    : [];
  const feedbackReady =
    !pending &&
    feedbackSettled?.key === feedbackContextKey &&
    feedbackSettled.sources === activeSources;
  const showFeedback =
    prefs.collectFeedback &&
    !preview &&
    !isLocalAIPrivate() &&
    !isPrivateInput(displayInput) &&
    trim(displayInput) !== '';

  return (
    <React.Fragment>
      {boxes.length > 0 ? (
        <>
          <div>{renderedBoxes}</div>
          {pending ? (
            <div aria-live="polite" data-testid="magic-box-pending">
              {t('magicBox.loading')}
            </div>
          ) : null}
        </>
      ) : pending ? (
        <PendingState />
      ) : (
        <EmptyState input={displayInput} />
      )}
      {showFeedback ? (
        <React.Suspense fallback={null}>
          <FeedbackPanel
            key={feedbackContextKey}
            input={magicIn}
            candidates={feedbackCandidates}
            selectedCandidateId={selectedIndex >= 0 ? selectedKey : null}
            ready={feedbackReady}
          />
        </React.Suspense>
      ) : null}
      <BoxModal
        box={modalBox}
        onClose={handleCloseModal}
        onCopy={copyModalText}
        onInputCommit={handleInputCommit}
        onResultChange={handleModalResultChange}
        open={modalIsActive}
      />
      <CustomizedSnackbar notify={notify} />
    </React.Fragment>
  );
};

export default MagicBox;
