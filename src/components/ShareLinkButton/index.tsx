import { useEffect, useRef, useState } from 'react';
import copyTextToClipboard from '@functions/clipboard';

interface ShareLinkButtonProps {
  getShareLink: () => string;
  'data-testid'?: string;
}

const CheckIcon = () => (
  <svg aria-hidden="true" fill="none" height="14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24" width="14">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const LinkIcon = () => (
  <svg aria-hidden="true" fill="none" height="14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24" width="14">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const ShareLinkButton = ({
  getShareLink,
  'data-testid': testId,
}: ShareLinkButtonProps) => {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  const handleClick = () => {
    copyTextToClipboard(getShareLink());
    setCopied(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), 1200);
  };

  return (
    <button
      aria-label="Copy share link"
      className="share-link-button"
      data-testid={testId}
      onClick={handleClick}
      type="button"
    >
      {copied ? <CheckIcon /> : <LinkIcon />}
    </button>
  );
};

export default ShareLinkButton;
