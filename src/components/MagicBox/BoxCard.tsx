import { resolveBoxTemplate } from '@components/BoxTemplate/resolveBoxTemplate';
import ErrorBoundary, {
  TemplateErrorFallback,
} from '@components/ErrorBoundary';
import type { BoxProps, Box as BoxType } from '@modules/Box';
import {
  forwardRef,
  memo,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useLocale } from '../../contexts/LocaleContext';

// Anything a template renders that the user operates. The card itself is a
// role button div, which is fine: closest reaches it only when the click
// landed on no control in between.
const CONTROL_SELECTOR =
  'a, button, input, select, textarea, summary, label, [role="button"], [contenteditable="true"]';

const ExpandIcon = () => (
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
    <path d="M15 3h6v6" />
    <path d="M9 21H3v-6" />
    <path d="M21 3l-7 7" />
    <path d="M3 21l7-7" />
  </svg>
);

interface BoxCardProps {
  box: BoxType;
  index: number;
  selected: boolean;
  stale: boolean;
  onSelect: (index: number) => void;
  onCopy: (text: string) => Promise<boolean>;
  onInputCommit?: () => void;
  onExpand?: (box: BoxType) => void;
  onResultChange?: (
    box: BoxType,
    result: Pick<BoxProps, 'options' | 'plaintextOutput'>,
  ) => void;
}

const COPIED_TIMEOUT_MS = 1200;

const BoxCard = memo(
  forwardRef<HTMLDivElement, BoxCardProps>(
    (
      {
        box,
        index,
        selected,
        stale,
        onSelect,
        onCopy,
        onInputCommit,
        onExpand,
        onResultChange,
      },
      ref,
    ) => {
      const { t } = useLocale();
      const [justCopied, setJustCopied] = useState(false);
      const copySequence = useRef(0);
      const copiedTimer = useRef<number | null>(null);
      const {
        name,
        plaintextOutput,
        options,
        sourceInput,
        priority,
        tag,
        kind,
        onClick,
      } = box.props;
      const previousPlaintextOutput = useRef(plaintextOutput);
      const showExpand = box.props.showExpandButton !== false && !!onExpand;

      useEffect(() => {
        return () => {
          copySequence.current += 1;
          if (copiedTimer.current !== null) {
            window.clearTimeout(copiedTimer.current);
            copiedTimer.current = null;
          }
        };
      }, []);

      useLayoutEffect(() => {
        if (!stale) return;
        copySequence.current += 1;
        if (copiedTimer.current !== null) {
          window.clearTimeout(copiedTimer.current);
          copiedTimer.current = null;
        }
      }, [stale]);

      useLayoutEffect(() => {
        if (previousPlaintextOutput.current === plaintextOutput) return;

        previousPlaintextOutput.current = plaintextOutput;
        copySequence.current += 1;
        if (copiedTimer.current !== null) {
          window.clearTimeout(copiedTimer.current);
          copiedTimer.current = null;
        }
        setJustCopied(false);
      }, [plaintextOutput]);

      const markCopied = useCallback(
        async (text: string): Promise<void> => {
          if (stale) return;

          const sequence = ++copySequence.current;
          setJustCopied(false);
          if (copiedTimer.current !== null) {
            window.clearTimeout(copiedTimer.current);
            copiedTimer.current = null;
          }

          let copied = false;
          try {
            copied = await onCopy(text);
          } catch {
            copied = false;
          }
          if (!copied || sequence !== copySequence.current) return;

          onInputCommit?.();
          setJustCopied(true);
          copiedTimer.current = window.setTimeout(() => {
            if (sequence !== copySequence.current) return;
            copiedTimer.current = null;
            setJustCopied(false);
          }, COPIED_TIMEOUT_MS);
        },
        [onCopy, onInputCommit, stale],
      );

      const copyAndCommit = useCallback(
        async (text: string): Promise<void> => {
          if (stale) return;
          const sequence = ++copySequence.current;
          let copied = false;
          try {
            copied = await onCopy(text);
          } catch {
            copied = false;
          }
          if (!copied || sequence !== copySequence.current || stale) return;
          onInputCommit?.();
        },
        [onCopy, onInputCommit, stale],
      );

      const handleCopy = useCallback(
        (event: React.MouseEvent) => {
          event.stopPropagation();
          void markCopied(plaintextOutput);
          if (!stale) onClick(plaintextOutput);
        },
        [markCopied, onClick, plaintextOutput, stale],
      );

      const handleExpand = useCallback(
        (event: React.MouseEvent) => {
          event.stopPropagation();
          if (!stale) onExpand?.(box);
        },
        [box, onExpand, stale],
      );

      const handleCardClick = useCallback(() => {
        if (stale) return;
        onSelect(index);
        void copyAndCommit(plaintextOutput);
        onClick(plaintextOutput);
      }, [copyAndCommit, index, onClick, onSelect, plaintextOutput, stale]);

      // A click on a control inside the card belongs to that control, not to
      // the card's copy action. A portal opened by a template also bubbles
      // through the React tree without sitting inside the card in the DOM.
      const handleMouseClick = useCallback(
        (event: React.MouseEvent<HTMLDivElement>) => {
          if (stale) return;
          const target = event.target as Element;
          if (!event.currentTarget.contains(target)) return;
          if (target.closest(CONTROL_SELECTOR) !== event.currentTarget) return;
          handleCardClick();
        },
        [handleCardClick, stale],
      );

      const handleKeyDown = useCallback(
        (event: React.KeyboardEvent<HTMLDivElement>) => {
          if (stale) return;
          if (event.key === 'Enter' || event.key === ' ') {
            event.stopPropagation();
            if (event.target !== event.currentTarget) return;
            event.preventDefault();
            handleCardClick();
          }
        },
        [handleCardClick, stale],
      );

      const handleTemplateClick = useCallback(
        (text: string): void => {
          if (stale) return;
          void copyAndCommit(text);
          onClick(text);
        },
        [copyAndCommit, onClick, stale],
      );

      const handleTemplateResultChange = useCallback(
        (result: Pick<BoxProps, 'options' | 'plaintextOutput'>): void => {
          if (!stale) onResultChange?.(box, result);
        },
        [box, onResultChange, stale],
      );

      const blockStaleInteraction = useCallback(
        (event: React.SyntheticEvent): void => {
          if (!stale) return;
          event.preventDefault();
          event.stopPropagation();
        },
        [stale],
      );

      const Comp = resolveBoxTemplate(box);

      return (
        // biome-ignore lint/a11y/useSemanticElements: outer needs nested buttons (Copy / Expand), so it cannot itself be a button.
        <div
          ref={ref}
          aria-disabled={stale || undefined}
          className={
            'box-card' +
            (selected ? ' is-selected' : '') +
            (stale ? ' is-stale' : '')
          }
          data-testid="magic-box-result"
          onClick={handleMouseClick}
          onClickCapture={blockStaleInteraction}
          onChangeCapture={blockStaleInteraction}
          onInputCapture={blockStaleInteraction}
          onKeyDown={handleKeyDown}
          onKeyDownCapture={blockStaleInteraction}
          onPointerDownCapture={blockStaleInteraction}
          role="button"
          tabIndex={stale ? -1 : 0}
        >
          <div className="box-head">
            <span aria-hidden="true" className="box-tag">
              {tag ?? '·'}
            </span>
            <span
              className="box-title"
              data-testid="magic-box-result-title"
              title={name}
            >
              {name}
            </span>
            {kind ? <span className="box-kind">{kind}</span> : null}
            <span className="box-actions">
              <button
                className="box-copy"
                disabled={stale}
                onClick={handleCopy}
                type="button"
                aria-label={t('boxCard.copyLabel', { name })}
              >
                {justCopied ? t('boxCard.copied') : t('boxCard.copy')}
              </button>
              {showExpand ? (
                <button
                  aria-label={t('boxCard.expandLabel', { name })}
                  className="box-expand"
                  disabled={stale}
                  onClick={handleExpand}
                  title={t('boxCard.expand')}
                  type="button"
                >
                  <ExpandIcon />
                </button>
              ) : null}
            </span>
          </div>
          <div className="box-body">
            <ErrorBoundary
              fallback={(retry) => <TemplateErrorFallback retry={retry} />}
              resetKey={box}
            >
              <Suspense fallback={null}>
                <Comp
                  disabled={stale}
                  kind={kind}
                  name={name}
                  onClick={handleTemplateClick}
                  onResultChange={handleTemplateResultChange}
                  options={options}
                  plaintextOutput={plaintextOutput}
                  priority={priority}
                  selected={selected}
                  sourceInput={sourceInput}
                  tag={tag}
                />
              </Suspense>
            </ErrorBoundary>
          </div>
        </div>
      );
    },
  ),
);

BoxCard.displayName = 'BoxCard';

export default BoxCard;
