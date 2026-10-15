import { resolveBoxTemplate } from '@components/BoxTemplate/resolveBoxTemplate';
import ErrorBoundary, {
  TemplateErrorFallback,
} from '@components/ErrorBoundary';
import type { BoxProps, Box as BoxType } from '@modules/Box';
import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useLocale } from '../../contexts/LocaleContext';

// Anything a template renders that the user operates. The card itself is a
// `role="button"` div, which is fine: `closest` reaches it only when the click
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
  selected: boolean;
  onSelect: () => void;
  onCopy: (text: string) => Promise<boolean>;
  onExpand?: () => void;
  onResultChange?: BoxProps['onResultChange'];
}

const COPIED_TIMEOUT_MS = 1200;

const BoxCard = forwardRef<HTMLDivElement, BoxCardProps>(
  ({ box, selected, onSelect, onCopy, onExpand, onResultChange }, ref) => {
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

        setJustCopied(true);
        copiedTimer.current = window.setTimeout(() => {
          if (sequence !== copySequence.current) return;
          copiedTimer.current = null;
          setJustCopied(false);
        }, COPIED_TIMEOUT_MS);
      },
      [onCopy],
    );

    const handleCopy = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        void markCopied(plaintextOutput);
        onClick(plaintextOutput);
      },
      [markCopied, onClick, plaintextOutput],
    );

    const handleExpand = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onExpand?.();
      },
      [onExpand],
    );

    const handleCardClick = () => {
      onSelect();
      void Promise.resolve(onCopy(plaintextOutput)).catch(() => undefined);
      onClick(plaintextOutput);
    };

    // A click on a control inside the card belongs to that control, not to
    // the card's copy action. Neither does a click from a portal the template
    // opened (a MUI Modal): React bubbles it through the component tree even
    // though it sits outside the card in the DOM. Without this, an interactive
    // template had to stop propagation on every element — and one it missed
    // (a textarea, a select in its dialog) overwrote the clipboard.
    const handleMouseClick = (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as Element;
      if (!e.currentTarget.contains(target)) return;
      if (target.closest(CONTROL_SELECTOR) !== e.currentTarget) return;
      handleCardClick();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.stopPropagation();
        if (e.target !== e.currentTarget) return;
        e.preventDefault();
        handleCardClick();
      }
    };

    // Resolve semantic source output into the matching web presentation.
    const Comp = resolveBoxTemplate(box);

    return (
      // biome-ignore lint/a11y/useSemanticElements: outer needs nested buttons (Copy / Expand), so it cannot itself be a <button>.
      <div
        ref={ref}
        className={`box-card${selected ? ' is-selected' : ''}`}
        data-testid="magic-box-result"
        onClick={handleMouseClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
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
            <Comp
              kind={kind}
              name={name}
              onClick={(text) => {
                void Promise.resolve(onCopy(text)).catch(() => undefined);
                onClick(text);
              }}
              onResultChange={onResultChange}
              options={options}
              plaintextOutput={plaintextOutput}
              priority={priority}
              selected={selected}
              sourceInput={sourceInput}
              tag={tag}
            />
          </ErrorBoundary>
        </div>
      </div>
    );
  },
);

BoxCard.displayName = 'BoxCard';

export default BoxCard;
