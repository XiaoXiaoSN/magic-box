import copyTextToClipboard from '@functions/clipboard';
import { useEffect, useRef, useState } from 'react';
import { useLocale } from '../../contexts/LocaleContext';

interface ShareLinkButtonProps {
  getShareLink: () => string;
  onCopySuccess?: (copyKey: string | undefined) => void;
  copyKey?: string;
  'data-testid'?: string;
  disabled?: boolean;
  disabledLabel?: string;
}

const CheckIcon = () => (
  <svg
    aria-hidden="true"
    fill="none"
    height="14"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="2.2"
    viewBox="0 0 24 24"
    width="14"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const LinkIcon = () => (
  <svg
    aria-hidden="true"
    fill="none"
    height="14"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="2.2"
    viewBox="0 0 24 24"
    width="14"
  >
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const ShareLinkButton = ({
  getShareLink,
  onCopySuccess,
  copyKey,
  'data-testid': testId,
  disabled = false,
  disabledLabel,
}: ShareLinkButtonProps) => {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);
  const copySequence = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onCopySuccessRef = useRef(onCopySuccess);

  onCopySuccessRef.current = onCopySuccess;

  useEffect(() => {
    return () => {
      copySequence.current += 1;
      clearTimeout(timerRef.current);
    };
  }, []);

  // prop changes invalidate an in-flight copy even though the effect only mutates refs
  // biome-ignore lint/correctness/useExhaustiveDependencies: copyKey and disabled intentionally fence pending copies
  useEffect(() => {
    copySequence.current += 1;
    setCopied(false);
    clearTimeout(timerRef.current);
    timerRef.current = undefined;
  }, [copyKey, disabled]);

  const handleClick = () => {
    if (disabled) return;
    const sequence = ++copySequence.current;
    const copyKeyAtStart = copyKey;
    setCopied(false);
    clearTimeout(timerRef.current);
    timerRef.current = undefined;

    void (async () => {
      let copied = false;
      try {
        copied = (await copyTextToClipboard(getShareLink())) === true;
      } catch {
        copied = false;
      }
      if (!copied || sequence !== copySequence.current) return;

      onCopySuccessRef.current?.(copyKeyAtStart);
      setCopied(true);
      timerRef.current = setTimeout(() => {
        if (sequence !== copySequence.current) return;
        timerRef.current = undefined;
        setCopied(false);
      }, 1200);
    })();
  };

  const label = disabled
    ? (disabledLabel ?? t('shareLink.copy'))
    : copied
      ? t('shareLink.copied')
      : t('shareLink.copy');

  return (
    <button
      aria-label={label}
      className="share-link-button"
      data-testid={testId}
      disabled={disabled}
      onClick={handleClick}
      title={label}
      type="button"
    >
      {copied ? <CheckIcon /> : <LinkIcon />}
    </button>
  );
};

export default ShareLinkButton;
