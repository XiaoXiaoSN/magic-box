import CustomizedSnackbar, {
  type SnackbarNotification,
} from '@components/Snackbar';
import copyTextToClipboard from '@functions/clipboard';
import { trim } from '@functions/helper';
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
  useMemo,
  useRef,
  useState,
} from 'react';
import { useIsBoxPreview } from '../../contexts/BoxPreviewContext';
import { useLocale } from '../../contexts/LocaleContext';
import { usePreferences } from '../../contexts/PreferencesContext';
import { useSettings } from '../../contexts/SettingsContext';
import BoxCard from './BoxCard';
import BoxModal from './BoxModal';

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

interface SourceResultSlot {
  boxes: BoxType[];
  runKey: string;
}

interface BoxEntry {
  box: BoxType;
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
        <div className="empty-sub">{t('magicBox.emptyStartSub')}</div>
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
  const [sourceResults, setSourceResults] = useState<
    Array<SourceResultSlot | null>
  >([]);
  const [runState, setRunState] = useState<RunState>('idle');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalBox, setModalBox] = useState<BoxType | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const itemRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const itemRefCallbacks = useRef<
    Map<string, (element: HTMLDivElement | null) => void>
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
  const currentRunKey = `${preview ? 'preview' : 'live'}:${magicIn}`;
  const copyKey = `${currentRunKey}:${displayInput}`;
  if (copyKeyRef.current !== copyKey) {
    copyKeyRef.current = copyKey;
    copySequence.current += 1;
  }
  currentInputRef.current = displayInput;

  const boxEntries = useMemo<BoxEntry[]>(() => {
    const entries: BoxEntry[] = [];
    sourceResults.forEach((slot, sourceIndex) => {
      const seenNames = new Map<string, number>();
      slot?.boxes.forEach((box) => {
        const name = box.props.name || 'box';
        const occurrence = seenNames.get(name) ?? 0;
        seenNames.set(name, occurrence + 1);
        entries.push({
          box,
          key: `${sourceIndex}:${name}:${occurrence}`,
          stale: isStale || slot.runKey !== currentRunKey,
        });
      });
    });
    return entries;
  }, [currentRunKey, isStale, sourceResults]);

  const boxes = useMemo(() => boxEntries.map(({ box }) => box), [boxEntries]);
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

  const copyText = useCallback(async (text: string): Promise<boolean> => {
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
      copyKeyRef.current !== copyKeyAtStart
    ) {
      return false;
    }
    setNotify({
      id: ++notificationId.current,
      severity: copied ? 'success' : 'error',
    });
    return copied;
  }, []);

  const handleInputCommit = useCallback((): void => {
    onInputCommitRef.current?.(currentInputRef.current);
  }, []);

  const handleOpenModal = useCallback(
    (box: BoxType): void => {
      if (isStale) return;
      setModalBox(box);
      setModalOpen(true);
    },
    [isStale],
  );

  const handleCloseModal = useCallback((): void => {
    setModalOpen(false);
    setModalBox(null);
  }, []);

  useEffect(() => {
    const boxSources = sources ?? filteredBoxSources;
    const controller = new AbortController();
    const runId = ++runIdRef.current;

    if (trim(magicIn) === '') {
      setSourceResults([]);
      setRunState('idle');
      setSelectedKey(null);
      setModalOpen(false);
      setModalBox(null);
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
    setSourceResults((current) =>
      Array.from(
        { length: boxSources.length },
        (_, sourceIndex) => current[sourceIndex] ?? null,
      ),
    );
    setRunState('pending');
    setSelectedKey(null);
    setModalOpen(false);
    setModalBox(null);

    const commitSlot = (sourceIndex: number, generated: BoxType[]): void => {
      if (controller.signal.aborted || runIdRef.current !== runId) return;
      setSourceResults((current) => {
        if (controller.signal.aborted || runIdRef.current !== runId) {
          return current;
        }
        const next = current.slice();
        next[sourceIndex] = {
          boxes: generated,
          runKey: currentRunKey,
        };
        return next;
      });
    };

    const largeInput = input.length > WORKER_AUTO_INPUT_LIMIT;
    const workerEntries: Array<{
      source: BoxSource;
      sourceId: string;
      sourceIndex: number;
    }> = [];
    const mainEntries: Array<{
      source: BoxSource;
      sourceIndex: number;
    }> = [];

    for (const [sourceIndex, boxSource] of boxSources.entries()) {
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
        workerEntries.push({ source: boxSource, sourceId, sourceIndex });
        continue;
      }

      if (boxSource.workerSafe === true && boxSource.canHandle && !matches) {
        commitSlot(sourceIndex, []);
        continue;
      }

      if (supportsInputSize) {
        mainEntries.push({ source: boxSource, sourceIndex });
        continue;
      }

      if (explicitlyRequested) {
        const limit =
          input.length > MAX_WORKER_INPUT_LENGTH
            ? MAX_WORKER_INPUT_LENGTH
            : WORKER_AUTO_INPUT_LIMIT;
        commitSlot(
          sourceIndex,
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
        commitSlot(sourceIndex, []);
      }
    }

    const mainTasks = mainEntries.map(async ({ source, sourceIndex }) => {
      try {
        const generated = await source.generateBoxes(input, options, context);
        if (controller.signal.aborted || runIdRef.current !== runId) return;
        commitSlot(sourceIndex, decorateBoxes(generated, source));
      } catch (error) {
        if (controller.signal.aborted || runIdRef.current !== runId) return;
        console.error(`[MagicBox] boxSource "${source.name}" threw:`, error);
        commitSlot(sourceIndex, []);
      }
    });

    const workerSourceIndexes = new Map(
      workerEntries.map(({ sourceId, sourceIndex }) => [sourceId, sourceIndex]),
    );
    const completedWorkerSources = new Set<string>();
    const reportWorkerError = (sourceId: string, message: string): void => {
      completedWorkerSources.add(sourceId);
      const sourceIndex = workerSourceIndexes.get(sourceId);
      const source = workerEntries.find(
        (entry) => entry.sourceId === sourceId,
      )?.source;
      if (sourceIndex === undefined || source === undefined) return;
      commitSlot(
        sourceIndex,
        decorateBoxes([sourceErrorBox(source, message)], source),
      );
    };

    let workerHandle: ComputeWorkerRunHandle | null = null;
    if (workerEntries.length > 0) {
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
          sourceIds: workerEntries.map(({ sourceId }) => sourceId),
          now,
          locale: runtimeLocale,
          timezone,
          timezoneOffset,
          timezoneMode,
        },
        {
          onSourceResult: (_workerRunId, sourceId, generated) => {
            completedWorkerSources.add(sourceId);
            const sourceIndex = workerSourceIndexes.get(sourceId);
            const source = workerEntries.find(
              (entry) => entry.sourceId === sourceId,
            )?.source;
            if (sourceIndex === undefined || source === undefined) return;
            commitSlot(sourceIndex, decorateBoxes(generated, source));
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
            for (const { sourceId } of workerEntries) {
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
      }
    });

    return () => {
      controller.abort();
      workerHandle?.cancel();
      if (runIdRef.current === runId) runIdRef.current += 1;
    };
  }, [
    currentRunKey,
    filteredBoxSources,
    locale,
    magicIn,
    prefs.timezoneMode,
    prefs.timezoneOffset,
    preview,
    sources,
  ]);

  useEffect(() => {
    if (selectedKey === null) return;
    const selectedEntry = boxEntries.find(({ key }) => key === selectedKey);
    if (!selectedEntry || selectedEntry.stale) {
      setSelectedKey(null);
    }
  }, [boxEntries, selectedKey]);

  useEffect(() => {
    if (
      !modalBox ||
      isStale ||
      !boxEntries.some(({ box, stale }) => box === modalBox && !stale)
    ) {
      setModalOpen(false);
      setModalBox(null);
    }
  }, [boxEntries, isStale, modalBox]);

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
    (key: string): ((element: HTMLDivElement | null) => void) => {
      const current = itemRefCallbacks.current.get(key);
      if (current) return current;

      const callback = (element: HTMLDivElement | null): void => {
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
      target: BoxType,
      result: Pick<BoxType['props'], 'options' | 'plaintextOutput'>,
    ): void => {
      setSourceResults((current) => {
        let changed = false;
        const next = current.map((slot) => {
          if (slot === null || slot.runKey !== currentRunKey) return slot;
          const boxes = slot.boxes.map((box) => {
            if (box !== target) return box;
            if (
              box.props.plaintextOutput === result.plaintextOutput &&
              box.props.options === result.options
            ) {
              return box;
            }
            changed = true;
            return {
              ...box,
              props: { ...box.props, ...result },
            };
          });
          return changed ? { ...slot, boxes } : slot;
        });
        return changed ? next : current;
      });
    },
    [currentRunKey],
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
      const interactive = target?.closest('a, button, [role="button"]');
      if (interactive && !target?.closest('.box-card')) return;

      const state = latestKeyboardState.current;
      if (state.entries.length === 0) return;

      const isCtrl = event.ctrlKey || event.metaKey;
      const selectedPosition = state.entries.findIndex(
        ({ key }) => key === state.selectedKey,
      );
      const selected = state.entries[selectedPosition]?.box;

      if (event.key === 'Enter' && isCtrl) {
        event.preventDefault();
        event.stopPropagation();
        if (!selected) return;

        const stdout = selected.props.plaintextOutput ?? '';
        if (stdout) {
          const inputSnapshot = currentInputRef.current;
          void copyText(stdout)
            .then((copied) => {
              if (!copied) return;
              onInputCommitRef.current?.(inputSnapshot);
              pasteAsInput(stdout);
            })
            .catch(() => undefined);
          selected.props.onClick(stdout);
        }
        return;
      }

      if (isCtrl && (event.key === 'n' || event.key === 'N')) {
        event.preventDefault();
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

      if (event.key !== 'Enter' || isCtrl || state.copyMode === 'off') return;
      if (!selected) return;

      const tag = target?.tagName?.toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA') {
        event.preventDefault();
        event.stopPropagation();
      }

      const stdout = selected.props.plaintextOutput ?? '';
      if (!stdout) return;
      const inputSnapshot = currentInputRef.current;
      void copyText(stdout)
        .then((copied) => {
          if (!copied) return;
          onInputCommitRef.current?.(inputSnapshot);
          if (state.copyMode === 'paste') pasteAsInput(stdout);
        })
        .catch(() => undefined);
      selected.props.onClick(stdout);
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // the handler reads refs so this listener is registered once per mount.
  }, [copyText, pasteAsInput]);

  const renderedBoxes = boxEntries.map(({ box, key, stale }, index) => (
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
      selected={!stale && index === selectedIndex}
      stale={stale}
    />
  ));

  const pending =
    runState === 'pending' || (isStale && trim(displayInput) !== '');
  const modalIsActive =
    modalOpen &&
    !isStale &&
    modalBox !== null &&
    boxEntries.some(({ box, stale }) => box === modalBox && !stale);

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
      <BoxModal
        box={modalBox}
        onClose={handleCloseModal}
        onCopy={copyText}
        onInputCommit={handleInputCommit}
        open={modalIsActive}
      />
      <CustomizedSnackbar notify={notify} />
    </React.Fragment>
  );
};

export default MagicBox;
