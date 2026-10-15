import type { BoxProps } from '@modules/Box';
import { extractOptionKeys } from '@modules/Box';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useLocale } from '../../contexts/LocaleContext';
import {
  isHttpUrl,
  requestShortenURL,
} from '../../modules/boxSources/shortenURL';

const getAlias = (options: BoxProps['options']): string | null => {
  const value = extractOptionKeys(options, 'surl', 'shorten');
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
};

const ShortenURLBoxTemplate = memo(
  ({
    disabled = false,
    onClick,
    onResultChange,
    options,
    plaintextOutput,
    sourceInput,
  }: BoxProps): React.JSX.Element => {
    const { t } = useLocale();
    const input = sourceInput ?? plaintextOutput;
    const alias = getAlias(options);
    const preview = options?.preview === true;
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<string | null>(null);
    const requestController = useRef<AbortController | null>(null);

    // biome-ignore lint/correctness/useExhaustiveDependencies: input, alias, and disabled intentionally reset the action state
    useEffect(() => {
      requestController.current?.abort();
      requestController.current = null;
      setLoading(false);
      setError(null);
      setResult(null);
      return () => requestController.current?.abort();
    }, [alias, disabled, input, preview]);

    const runRequest = useCallback(async (): Promise<void> => {
      if (preview || disabled || loading) return;

      if (!isHttpUrl(input)) {
        setError(t('shortenURL.invalidUrl'));
        setResult(null);
        return;
      }

      const controller = new AbortController();
      requestController.current?.abort();
      requestController.current = controller;
      setLoading(true);
      setError(null);
      setResult(null);

      try {
        const shortURL = await requestShortenURL(
          input,
          alias,
          controller.signal,
        );
        if (controller.signal.aborted) return;
        setResult(shortURL);
        onResultChange?.({ options, plaintextOutput: shortURL });
      } catch {
        if (controller.signal.aborted) return;
        setError(t('shortenURL.requestFailed'));
      } finally {
        if (requestController.current === controller) {
          requestController.current = null;
          setLoading(false);
        }
      }
    }, [alias, disabled, input, loading, onResultChange, options, preview, t]);

    const handleResultClick = useCallback(() => {
      if (result) onClick(result);
    }, [onClick, result]);

    return (
      <div className="box-out shorten-url" data-testid="shorten-url-template">
        <button
          data-testid="shorten-url-action"
          disabled={preview || disabled || loading}
          onClick={(event) => {
            event.stopPropagation();
            void runRequest();
          }}
          type="button"
        >
          {loading ? t('shortenURL.loading') : t('shortenURL.action')}
        </button>
        {preview ? (
          <span data-testid="shorten-url-preview">
            {t('shortenURL.preview')}
          </span>
        ) : null}
        {error ? (
          <span data-testid="shorten-url-error" role="alert">
            {error}
          </span>
        ) : null}
        {result ? (
          <button
            className="mono"
            data-testid="shorten-url-result"
            onClick={(event) => {
              event.stopPropagation();
              handleResultClick();
            }}
            type="button"
          >
            {result}
          </button>
        ) : null}
      </div>
    );
  },
);

ShortenURLBoxTemplate.displayName = 'ShortenURLBoxTemplate';

export default ShortenURLBoxTemplate;
