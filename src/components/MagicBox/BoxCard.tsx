import { resolveBoxTemplate } from '@components/BoxTemplate/resolveBoxTemplate';
import type { BoxProps, Box as BoxType } from '@modules/Box';
import { forwardRef, useCallback, useState } from 'react';
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
  onCopy: (text: string) => void;
  onExpand?: () => void;
  onResultChange?: BoxProps['onResultChange'];
}

const COPIED_TIMEOUT_MS = 1200;

const BoxCard = forwardRef<HTMLDivElement, BoxCardProps>(
  ({ box, selected, onSelect, onCopy, onExpand, onResultChange }, ref) => {
    const { t } = useLocale();
    const [justCopied, setJustCopied] = useState(false);
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
    const showExpand = box.props.showExpandButton !== false && !!onExpand;

    const handleCopy = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onCopy(plaintextOutput);
        onClick(plaintextOutput);
        setJustCopied(true);
        window.setTimeout(() => setJustCopied(false), COPIED_TIMEOUT_MS);
      },
      [plaintextOutput, onCopy, onClick],
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
      onCopy(plaintextOutput);
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
          <Comp
            kind={kind}
            name={name}
            onClick={(text) => {
              onCopy(text);
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
        </div>
      </div>
    );
  },
);

BoxCard.displayName = 'BoxCard';

export default BoxCard;
