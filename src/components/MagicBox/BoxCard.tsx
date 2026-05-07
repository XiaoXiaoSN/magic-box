import type { Box as BoxType } from '@modules/Box';
import { forwardRef, useCallback, useState } from 'react';

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
}

const COPIED_TIMEOUT_MS = 1200;

const BoxCard = forwardRef<HTMLDivElement, BoxCardProps>(
  ({ box, selected, onSelect, onCopy, onExpand }, ref) => {
    const [justCopied, setJustCopied] = useState(false);
    const { name, plaintextOutput, options, priority, tag, kind, onClick } =
      box.props;
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

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleCardClick();
      }
    };

    const Comp = box.boxTemplate;

    return (
      // biome-ignore lint/a11y/useSemanticElements: outer needs nested buttons (Copy / Expand), so it cannot itself be a <button>.
      <div
        ref={ref}
        className={`box-card${selected ? ' is-selected' : ''}`}
        data-testid="magic-box-result"
        onClick={handleCardClick}
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
              aria-label={`Copy ${name} output`}
            >
              {justCopied ? 'Copied' : 'Copy'}
            </button>
            {showExpand ? (
              <button
                aria-label={`Expand ${name}`}
                className="box-expand"
                onClick={handleExpand}
                title="Expand"
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
            onClick={onClick}
            options={options}
            plaintextOutput={plaintextOutput}
            priority={priority}
            selected={selected}
            tag={tag}
          />
        </div>
      </div>
    );
  },
);

BoxCard.displayName = 'BoxCard';

export default BoxCard;
