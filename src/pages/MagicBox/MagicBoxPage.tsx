import MagicBox from '@components/MagicBox';
import ShareLinkButton from '@components/ShareLinkButton';
import { buildShareLink } from '@functions/shareLink';
import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale } from '../../contexts/LocaleContext';
import type { HistoryItem } from '../../hooks/useSearchHistory';
import { useSearchHistory } from '../../hooks/useSearchHistory';
import type { Translations } from '../../i18n';

const QRCodeReader = React.lazy(async () => import('@components/QRCodeReader'));

// Strips inline ::option directives and surfaces them as chips so users can
// see what flags will be applied without leaving the input.
const parseOptionsForChips = (input: string) => {
  const regex = /\n::(\w+)=?(\S*)/gm;
  const opts: Record<string, string | true> = {};
  for (const match of input.matchAll(regex)) {
    const key = match[1].toLowerCase();
    const value = match[2];
    opts[key] = value || true;
  }
  return opts;
};

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
  const { t } = useLocale();
  const [userInput, setUserInput] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('input') ?? params.get('i') ?? '';
  });
  const [magicIn, setMagicIn] = useState('');
  const [resetCounter, setResetCounter] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastRecordedRef = useRef<string>('');

  const { history, addEntry, removeEntry, clearHistory } = useSearchHistory();

  // Focus the textarea on first load so users can start typing without an
  // extra click.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounce input → magicIn so MagicBox doesn't run on every keystroke.
  useEffect(() => {
    const timeoutID = window.setTimeout(() => setMagicIn(userInput), 500);
    return () => window.clearTimeout(timeoutID);
  }, [userInput]);

  // Record to search history when debounced input settles.
  useEffect(() => {
    const trimmed = magicIn.trim();
    if (trimmed && trimmed !== lastRecordedRef.current) {
      lastRecordedRef.current = trimmed;
      addEntry(trimmed);
    }
  }, [magicIn, addEntry]);

  const optionChips = useMemo(
    () => Object.entries(parseOptionsForChips(userInput)),
    [userInput],
  );

  const handleScannedInput = (value: string) => {
    setUserInput(value);
    if (inputRef.current) inputRef.current.value = value;
  };

  const handleHistorySelect = (input: string) => {
    setUserInput(input);
    if (inputRef.current) inputRef.current.value = input;
    setHistoryOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className="home">
      <div className="home-inner">
        <div className="home-col">
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
          </div>

          {historyOpen ? (
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
              name="magicInput"
              onChange={(e) => setUserInput(e.target.value)}
              onFocus={() => setResetCounter((c) => c + 1)}
              placeholder={t('magicBox.placeholder')}
              rows={8}
              spellCheck={false}
              value={userInput}
            />
            <Suspense fallback={<div />}>
              <QrButton setUserInput={handleScannedInput} />
            </Suspense>
          </div>
        </div>

        <div className="home-col">
          <div className="home-col-head">
            <span aria-hidden="true" className="dot" />
            <span>{t('magicBox.output')}</span>
            <span className="swap">
              <span className="kbd">⌃</span>
              <span className="kbd">N</span>
              <span className="swap-label">{t('magicBox.next')}</span>
              <span className="swap-sep" />
              <span className="kbd">↵</span>
              <span className="swap-label">{t('magicBox.copy')}</span>
            </span>
          </div>
          <div className="boxes" data-testid="magic-output">
            <MagicBox
              input={magicIn}
              onPasteInput={(val: string) => {
                setUserInput(val);
                if (inputRef.current) inputRef.current.value = val;
              }}
              resetTrigger={resetCounter}
            />
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
