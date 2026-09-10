import MagicBox from '@components/MagicBox';
import ShareLinkButton from '@components/ShareLinkButton';
import { parseOptionsForChips } from '@functions/parseOptions';
import { buildShareLink } from '@functions/shareLink';
import React, {
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useLocale } from '../../contexts/LocaleContext';
import type { HistoryItem } from '../../hooks/useSearchHistory';
import { useSearchHistory } from '../../hooks/useSearchHistory';
import type { Translations } from '../../i18n';
import { localAIMessages } from '../../features/local-ai/messages';
import { activateLocalAIPrivacy, isLocalAIMode } from '../../features/local-ai/privacy';
import '../../features/local-ai/localAI.css';

const LocalAIPanel = React.lazy(async () => import('../../features/local-ai/LocalAIPanel'));

const QRCodeReader = React.lazy(async () => import('@components/QRCodeReader'));

const formatRelativeTime = (
  timestamp: number,
  t: (
    key: keyof Translations,
    params?: Record<string, string | number>,
  ) => string,
): string => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return t('time.justNow');
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t('time.minutesAgo', { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('time.hoursAgo', { n: hours });
  const days = Math.floor(hours / 24);
  if (days < 7) return t('time.daysAgo', { n: days });
  return new Date(timestamp).toLocaleDateString();
};

const MagicBoxPage = (): React.JSX.Element => {
  const { t, locale } = useLocale();
  const m = localAIMessages[locale];
  const [aiMode, setAIMode] = useState(() => isLocalAIMode(window.location.search));
  const [aiInput, setAIInput] = useState('');
  const [userInput, setUserInput] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return isLocalAIMode(window.location.search) ? '' : params.get('input') ?? params.get('i') ?? '';
  });
  const [magicIn, setMagicIn] = useState('');
  const [resetCounter, setResetCounter] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);
  const displayedInput = aiMode ? aiInput : userInput;

  useLayoutEffect(() => {
    if (!aiMode) return;
    activateLocalAIPrivacy();
    const url = new URL(window.location.href);
    url.searchParams.delete('input');
    url.searchParams.delete('i');
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  }, [aiMode]);

  const changeMode = (next: boolean) => {
    if (next) activateLocalAIPrivacy();
    setHistoryOpen(false);
    setAIMode(next);
    // Only the mode is linkable, never AI content. Separate drafts mean an
    // AI prompt cannot leak into the tools debounce when switching back.
    const url = new URL(window.location.href);
    url.searchParams.delete('input');
    url.searchParams.delete('i');
    if (next) url.searchParams.set('mode', 'local-ai');
    else url.searchParams.delete('mode');
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  };

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastRecordedRef = useRef<string>('');
  // caret index to restore after a programmatic (non-typing) value update;
  // null means "leave the caret where the browser puts it" (normal typing).
  const pendingCaretRef = useRef<number | null>(null);

  const { history, addEntry, removeEntry, clearHistory } = useSearchHistory();

  // Focus the textarea on first load so users can start typing without an
  // extra click.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounce input → magicIn so MagicBox doesn't run on every keystroke.
  useEffect(() => {
    if (aiMode) return;
    const timeoutID = window.setTimeout(() => setMagicIn(userInput), 500);
    return () => window.clearTimeout(timeoutID);
  }, [userInput, aiMode]);

  // Record to search history when debounced input settles.
  useEffect(() => {
    if (aiMode) return;
    const trimmed = magicIn.trim();
    if (trimmed && trimmed !== lastRecordedRef.current) {
      lastRecordedRef.current = trimmed;
      addEntry(trimmed);
    }
  }, [magicIn, addEntry, aiMode]);

  const optionChips = useMemo(
    () => aiMode ? [] : Object.entries(parseOptionsForChips(userInput)),
    [userInput, aiMode],
  );

  // After a programmatic value replacement, the controlled textarea re-renders
  // with the new value but the browser would otherwise leave the caret at a
  // stale offset. Restore the intended caret position once the DOM reflects
  // the new value, using the ref only for selection (never as the value
  // source). Runs synchronously before paint to avoid a visible caret jump.
  // displayedInput is the intended trigger: the effect reads refs but must re-run
  // after every value commit so the caret is restored against the freshly
  // rendered DOM value.
  // biome-ignore lint/correctness/useExhaustiveDependencies: displayedInput is a deliberate caret-restoration trigger
  useLayoutEffect(() => {
    const caret = pendingCaretRef.current;
    if (caret === null) return;
    pendingCaretRef.current = null;
    const el = inputRef.current;
    if (!el) return;
    const pos = Math.min(caret, el.value.length);
    el.setSelectionRange(pos, pos);
  }, [displayedInput]);

  // Replaces the whole input programmatically (QR scan, history pick, paste
  // back). Marks the caret to land at the end of the inserted text so the
  // next keystroke continues naturally.
  const replaceInput = (value: string) => {
    pendingCaretRef.current = value.length;
    if (aiMode) setAIInput(value);
    else setUserInput(value);
  };

  const handleScannedInput = (value: string) => {
    replaceInput(value);
  };

  const handleHistorySelect = (input: string) => {
    replaceInput(input);
    setHistoryOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className="home">
      <div className="home-inner">
        <div className="home-col">
          <div className="local-ai-mode" role="group" aria-label={m.mode}>
            <button className="btn-subtle" data-testid="mode-tools" aria-pressed={!aiMode} onClick={() => changeMode(false)} type="button">{m.tools}</button>
            <button className="btn-subtle" data-testid="mode-local-ai" aria-pressed={aiMode} onClick={() => changeMode(true)} type="button">{m.title}</button>
          </div>
          <div className="home-col-head">
            <span aria-hidden="true" className="dot" />
            <span>{t('magicBox.input')}</span>
            {optionChips.length > 0 ? (
              <span className="input-options" data-testid="input-options">
                {optionChips.map(([k, v]) => (
                  <span className="opt-chip" key={k}>
                    <span className="opt-k">{k}</span>
                    {v !== true ? (
                      <>
                        <span className="opt-eq">=</span>
                        <span className="opt-v">{String(v)}</span>
                      </>
                    ) : null}
                  </span>
                ))}
              </span>
            ) : null}
            {!aiMode ? <>
              <ShareLinkButton
                data-testid="copy-share-link"
                getShareLink={() =>
                  buildShareLink({ input: userInput, pathname: '/' })
                }
              />
              <button
                aria-label={
                  historyOpen
                    ? t('magicBox.closeHistory')
                    : t('magicBox.openHistory')
                }
                className={`history-toggle${historyOpen ? ' active' : ''}`}
                data-testid="history-toggle"
                onClick={() => setHistoryOpen((o) => !o)}
                type="button"
              >
                <svg
                  aria-hidden="true"
                  fill="none"
                  height="14"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  width="14"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </button>
            </> : null}
          </div>

          {!aiMode && historyOpen ? (
            <div className="history-panel" data-testid="history-panel">
              {history.length > 0 ? (
                <>
                  <div className="history-list">
                    {history.map((item: HistoryItem) => (
                      <div className="history-item" key={item.id}>
                        <button
                          className="history-item-btn"
                          onClick={() => handleHistorySelect(item.input)}
                          title={item.input}
                          type="button"
                        >
                          <span className="history-item-input">
                            {item.input.length > 50
                              ? `${item.input.slice(0, 50)}…`
                              : item.input}
                          </span>
                          <span className="history-item-time">
                            {formatRelativeTime(item.timestamp, t)}
                          </span>
                        </button>
                        <button
                          aria-label={t('magicBox.deleteEntry', {
                            input: item.input.slice(0, 30),
                          })}
                          className="history-item-del"
                          onClick={() => removeEntry(item.id)}
                          type="button"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    className="history-clear"
                    onClick={clearHistory}
                    type="button"
                  >
                    {t('magicBox.clearHistory')}
                  </button>
                </>
              ) : (
                <div className="history-empty">{t('magicBox.noHistory')}</div>
              )}
            </div>
          ) : null}

          <div className="input-card">
            <textarea
              ref={inputRef}
              data-testid="magic-input"
              name={aiMode ? "localAIInput" : "magicInput"}
              autoComplete="off"
              onChange={(e) => aiMode ? setAIInput(e.target.value) : setUserInput(e.target.value)}
              onFocus={() => setResetCounter((c) => c + 1)}
              placeholder={aiMode ? m.placeholder : t('magicBox.placeholder')}
              rows={8}
              spellCheck={false}
              value={displayedInput}
            />
            {!aiMode ? <Suspense fallback={<div />}>
              <QrButton setUserInput={handleScannedInput} />
            </Suspense> : null}
          </div>
          {aiMode ? <p className="local-ai-hint">{m.privacy}</p> : null}
        </div>

        <div className="home-col">
          <div className="home-col-head">
            <span aria-hidden="true" className="dot" />
            <span>{t('magicBox.output')}</span>
            {!aiMode ? <span className="swap">
              <span className="kbd">⌃</span>
              <span className="kbd">N</span>
              <span className="swap-label">{t('magicBox.next')}</span>
              <span className="swap-sep" />
              <span className="kbd">↵</span>
              <span className="swap-label">{t('magicBox.copy')}</span>
            </span> : null}
          </div>
          <div className="boxes" data-testid="magic-output">
            {aiMode ? (
              <Suspense fallback={<p role="status">{m.title}</p>}>
                <LocalAIPanel input={aiInput} onPasteInput={replaceInput} />
              </Suspense>
            ) : <MagicBox
              input={magicIn}
              onPasteInput={(val: string) => {
                replaceInput(val);
              }}
              resetTrigger={resetCounter}
            />}
          </div>
        </div>
      </div>
    </div>
  );
};

interface QrButtonProps {
  setUserInput: (value: string) => void;
}

// QR scanner button pinned bottom-right of the input card.
const QrButton = ({ setUserInput }: QrButtonProps) => (
  <div className="input-qr-btn" data-testid="qr-reader-launcher">
    <QRCodeReader
      setUserInput={
        setUserInput as React.Dispatch<React.SetStateAction<string>>
      }
      sxIcon={{ fontSize: 18, color: 'inherit' }}
    />
  </div>
);

export default MagicBoxPage;
