import CustomizedSnackbar, {
  type SnackbarNotification,
} from '@components/Snackbar';
import copyTextToClipboard from '@functions/clipboard';
import { trim } from '@functions/helper';
import { parseInput } from '@functions/parseOptions';
import type { Box as BoxType } from '@modules/Box';
import type { BoxSource, BoxSourceContext } from '@modules/BoxSource';
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

interface Props {
  input: string;
  liveInput?: string;
  sources?: BoxSource[];
  onPasteInput?: (value: string) => void;
  resetTrigger?: number;
}

type RunState = 'idle' | 'pending' | 'settled';

interface BoxEntry {
  box: BoxType;
  key: string;
}

interface KeyboardState {
  boxes: BoxType[];
  copyMode: 'enter' | 'paste' | 'off';
  isStale: boolean;
  selectedIndex: number;
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
  resetTrigger,
}: Props): React.JSX.Element => {
  const [notify, setNotify] = useState<SnackbarNotification | null>(null);
  const [sourceResults, setSourceResults] = useState<Array<BoxType[] | null>>(
    [],
  );
  const [runState, setRunState] = useState<RunState>('idle');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalBox, setModalBox] = useState<BoxType | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const itemRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const itemRefCallbacks = useRef<
    Map<string, (element: HTMLDivElement | null) => void>
  >(new Map());
  const copySequence = useRef(0);
  const notificationId = useRef(0);
  const runIdRef = useRef(0);
  const onPasteInputRef = useRef(onPasteInput);
  const { filteredBoxSources } = useSettings();
  const {
    prefs: { copyMode },
  } = usePreferences();
  const { t } = useLocale();
  const preview = useIsBoxPreview();

  onPasteInputRef.current = onPasteInput;

  const isStale = liveInput !== undefined && liveInput !== magicIn;
  const cardsStale = isStale || runState === 'pending';
  const displayInput = liveInput ?? magicIn;

  const boxEntries = useMemo<BoxEntry[]>(() => {
    const entries: BoxEntry[] = [];
    sourceResults.forEach((slot, sourceIndex) => {
      const seenNames = new Map<string, number>();
      slot?.forEach((box) => {
        const name = box.props.name || 'box';
        const occurrence = seenNames.get(name) ?? 0;
        seenNames.set(name, occurrence + 1);
        entries.push({
          box,
          key: `${sourceIndex}:${name}:${occurrence}`,
        });
      });
    });
    return entries;
  }, [sourceResults]);

  const boxes = useMemo(() => boxEntries.map(({ box }) => box), [boxEntries]);

  const latestKeyboardState = useRef<KeyboardState>({
    boxes: [],
    copyMode,
    isStale: false,
    selectedIndex: -1,
  });
  latestKeyboardState.current = {
    boxes,
    copyMode,
    isStale: cardsStale,
    selectedIndex,
  };

  useEffect(() => {
    return () => {
      copySequence.current += 1;
    };
  }, []);

  useEffect(() => {
    if (resetTrigger !== undefined) {
      setSelectedIndex(-1);
    }
  }, [resetTrigger]);

  const copyText = useCallback(async (text: string): Promise<boolean> => {
    const sequence = ++copySequence.current;
    let copied = false;

    if (text) {
      try {
        copied = (await copyTextToClipboard(text)) === true;
      } catch {
        copied = false;
      }
    }

    if (sequence === copySequence.current) {
      setNotify({
        id: ++notificationId.current,
        severity: copied ? 'success' : 'error',
      });
    }
    return copied;
  }, []);

  const handleOpenModal = useCallback(
    (box: BoxType): void => {
      if (cardsStale) return;
      setModalBox(box);
      setModalOpen(true);
    },
    [cardsStale],
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
      setSelectedIndex(-1);
      setModalOpen(false);
      setModalBox(null);
      return () => {
        controller.abort();
        if (runIdRef.current === runId) runIdRef.current += 1;
      };
    }

    const [input, options] = parseInput(magicIn);
    const context: BoxSourceContext = {
      preview,
      signal: controller.signal,
    };
    setSourceResults((current) =>
      Array.from(
        { length: boxSources.length },
        (_, sourceIndex) => current[sourceIndex] ?? null,
      ),
    );
    setRunState('pending');
    setSelectedIndex(-1);
    setModalOpen(false);
    setModalBox(null);

    const tasks = boxSources.map(async (boxSource, sourceIndex) => {
      try {
        const generated = await boxSource.generateBoxes(
          input,
          options,
          context,
        );
        if (controller.signal.aborted || runIdRef.current !== runId) return;

        const enriched = generated.map((box) => ({
          ...box,
          props: {
            ...box.props,
            tag: box.props.tag ?? boxSource.tag,
            kind: box.props.kind ?? boxSource.kind,
          },
        }));
        setSourceResults((current) => {
          if (controller.signal.aborted || runIdRef.current !== runId) {
            return current;
          }
          const next = current.slice();
          next[sourceIndex] = enriched;
          return next;
        });
      } catch (error) {
        if (controller.signal.aborted || runIdRef.current !== runId) return;
        console.error(`[MagicBox] boxSource "${boxSource.name}" threw:`, error);
        setSourceResults((current) => {
          if (runIdRef.current !== runId) return current;
          const next = current.slice();
          next[sourceIndex] = [];
          return next;
        });
      }
    });

    void Promise.all(tasks).then(() => {
      if (!controller.signal.aborted && runIdRef.current === runId) {
        setRunState('settled');
      }
    });

    return () => {
      controller.abort();
      if (runIdRef.current === runId) runIdRef.current += 1;
    };
  }, [filteredBoxSources, magicIn, preview, sources]);

  useEffect(() => {
    if (cardsStale) {
      setSelectedIndex(-1);
      return;
    }
    if (boxes.length === 0) {
      setSelectedIndex(-1);
      return;
    }
    if (selectedIndex >= boxes.length) {
      setSelectedIndex(boxes.length - 1);
    }
  }, [boxes.length, cardsStale, selectedIndex]);

  useEffect(() => {
    if (!cardsStale) return;
    setModalOpen(false);
    setModalBox(null);
  }, [cardsStale]);

  useEffect(() => {
    if (cardsStale || selectedIndex < 0) return;
    const entry = boxEntries[selectedIndex];
    const element = entry ? itemRefs.current.get(entry.key) : null;
    if (element) {
      try {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } catch {
        /* noop */
      }
    }
  }, [boxEntries, cardsStale, selectedIndex]);

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
      if (cardsStale) return;
      setSelectedIndex(index);
    },
    [cardsStale],
  );

  const handleResultChange = useCallback(
    (
      target: BoxType,
      result: Pick<BoxType['props'], 'options' | 'plaintextOutput'>,
    ): void => {
      setSourceResults((current) => {
        let changed = false;
        const next = current.map((slot) => {
          if (slot === null) return null;
          return slot.map((box) => {
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
        });
        return changed ? next : current;
      });
    },
    [],
  );

  useEffect(() => {
    const pasteAsInput = (value: string): void => {
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
    };

    const handler = (event: KeyboardEvent): void => {
      if (event.defaultPrevented || event.isComposing) return;

      const target = event.target instanceof Element ? event.target : null;
      const interactive = target?.closest('a, button, [role="button"]');
      if (interactive && !target?.closest('.box-card')) return;

      const state = latestKeyboardState.current;
      if (state.isStale || state.boxes.length === 0) return;

      const isCtrl = event.ctrlKey || event.metaKey;
      const selected = state.boxes[state.selectedIndex];

      if (event.key === 'Enter' && isCtrl) {
        event.preventDefault();
        event.stopPropagation();
        if (!selected) return;

        const stdout = selected.props.plaintextOutput ?? '';
        if (stdout) {
          void copyText(stdout).catch(() => undefined);
          selected.props.onClick(stdout);
          pasteAsInput(stdout);
        }
        return;
      }

      if (isCtrl && (event.key === 'n' || event.key === 'N')) {
        event.preventDefault();
        setSelectedIndex((previous) => {
          const next = event.shiftKey ? previous - 1 : previous + 1;
          if (next < 0) return 0;
          if (next >= state.boxes.length) return state.boxes.length - 1;
          return next;
        });
        return;
      }

      if (
        event.ctrlKey &&
        !event.metaKey &&
        (event.key === 'p' || event.key === 'P')
      ) {
        event.preventDefault();
        setSelectedIndex((previous) => Math.max(previous - 1, 0));
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
      void copyText(stdout).catch(() => undefined);
      selected.props.onClick(stdout);
      if (state.copyMode === 'paste') pasteAsInput(stdout);
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // the handler reads refs so this listener is registered once per mount.
  }, [copyText]);

  const renderedBoxes = boxEntries.map(({ box, key }, index) => (
    <BoxCard
      key={key}
      ref={getItemRef(key)}
      box={box}
      index={index}
      onCopy={copyText}
      onExpand={
        box.props.showExpandButton !== false ? handleOpenModal : undefined
      }
      onResultChange={handleResultChange}
      onSelect={handleSelect}
      selected={!cardsStale && index === selectedIndex}
      stale={cardsStale}
    />
  ));

  const pending =
    runState === 'pending' || (isStale && trim(displayInput) !== '');

  return (
    <React.Fragment>
      {boxes.length > 0 ? (
        <>
          <div className={cardsStale ? 'boxes-stale' : undefined}>
            {renderedBoxes}
          </div>
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
        open={modalOpen}
      />
      <CustomizedSnackbar notify={notify} />
    </React.Fragment>
  );
};

export default MagicBox;
