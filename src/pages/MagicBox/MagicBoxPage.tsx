import MagicBox from '@components/MagicBox';
import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';

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

const MagicBoxPage = (): React.JSX.Element => {
  const [userInput, setUserInput] = useState('');
  const [magicIn, setMagicIn] = useState('');
  const [resetCounter, setResetCounter] = useState(0);

  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Hydrate input from query string on first load (?input=... or ?i=...) and
  // focus the textarea so users can start typing without an extra click.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const seed = params.get('input') ?? params.get('i');
    if (seed) {
      setUserInput(seed);
      if (inputRef.current) inputRef.current.value = seed;
    }
    inputRef.current?.focus();
  }, []);

  // Debounce input → magicIn so MagicBox doesn't run on every keystroke.
  useEffect(() => {
    const timeoutID = window.setTimeout(() => setMagicIn(userInput), 500);
    return () => window.clearTimeout(timeoutID);
  }, [userInput]);

  const optionChips = useMemo(
    () => Object.entries(parseOptionsForChips(userInput)),
    [userInput],
  );

  const handleScannedInput = (value: string) => {
    setUserInput(value);
    if (inputRef.current) inputRef.current.value = value;
  };

  return (
    <div className="home">
      <div className="home-inner">
        <div className="home-col">
          <div className="home-col-head">
            <span aria-hidden="true" className="dot" />
            <span>Input</span>
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
          </div>
          <div className="input-card">
            <textarea
              ref={inputRef}
              data-testid="magic-input"
              name="magicInput"
              onChange={(e) => setUserInput(e.target.value)}
              onFocus={() => setResetCounter((c) => c + 1)}
              placeholder="Paste anything — a timestamp, JWT, JSON, cron, math expression…"
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
            <span>Output</span>
            <span className="swap">
              <span className="kbd">⌃</span>
              <span className="kbd">N</span>
              <span className="swap-label">next</span>
              <span className="swap-sep" />
              <span className="kbd">↵</span>
              <span className="swap-label">copy</span>
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
