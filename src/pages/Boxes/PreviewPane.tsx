import MagicBox from '@components/MagicBox';
import DirectiveAutocomplete, {
  DirectiveChips,
} from '@components/MagicBox/DirectiveAutocomplete';
import ShareLinkButton from '@components/ShareLinkButton';
import {
  activateLocalAIPrivacy,
  isPrivateInput,
  isSensitiveInput,
} from '@functions/localAIPrivacy';
import { buildShareLink } from '@functions/shareLink';
import type { BoxSource } from '@modules/BoxSource';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import { BoxPreviewProvider } from '../../contexts/BoxPreviewContext';
import { useLocale } from '../../contexts/LocaleContext';
import { getBoxSourceDisplay } from '../../i18n';
import { getBoxSource } from '../../modules/boxSources';

interface PreviewPaneProps {
  source: BoxSource;
}

const PreviewPane = ({ source }: PreviewPaneProps): React.JSX.Element => {
  const [params] = useSearchParams();
  const initialInput =
    getBoxSource(params.get('box') ?? '')?.id === source.id
      ? (params.get('input') ?? undefined)
      : undefined;
  const { locale, t } = useLocale();
  const display = getBoxSourceDisplay(source, locale);
  const [input, setInput] = useState(initialInput ?? source.defaultInput ?? '');
  const [magicIn, setMagicIn] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pendingCaretRef = useRef<number | null>(null);
  const privateInput = useMemo(() => isPrivateInput(input), [input]);
  const sensitiveInput = useMemo(() => isSensitiveInput(input), [input]);
  const sources = useMemo(() => [source], [source]);

  useEffect(() => {
    if (sensitiveInput) activateLocalAIPrivacy();
  }, [sensitiveInput]);

  useEffect(() => {
    const id = window.setTimeout(() => setMagicIn(input), 400);
    return () => window.clearTimeout(id);
  }, [input]);

  useEffect(() => {
    setInput(initialInput ?? source.defaultInput ?? '');
  }, [initialInput, source.defaultInput]);

  // restore the caret after a programmatic replacement; input is the deliberate trigger.
  // biome-ignore lint/correctness/useExhaustiveDependencies: input changes after programmatic replacement
  useLayoutEffect(() => {
    const caret = pendingCaretRef.current;
    if (caret === null || !inputRef.current) return;
    pendingCaretRef.current = null;
    inputRef.current.setSelectionRange(caret, caret);
  }, [input]);

  const replaceInputAt = useCallback((value: string, caret: number): void => {
    pendingCaretRef.current = caret;
    setInput(value);
  }, []);

  const pasteInput = useCallback(
    (value: string): void => {
      const textarea = inputRef.current;
      textarea?.focus();
      if (value === input) {
        textarea?.setSelectionRange(value.length, value.length);
        return;
      }
      replaceInputAt(value, value.length);
    },
    [input, replaceInputAt],
  );

  return (
    <div className="preview-stack">
      <div className="preview-meta">
        <h2 className="preview-title">{display.name}</h2>
        {display.kind ? (
          <span className="preview-kind">{display.kind}</span>
        ) : null}
      </div>
      {display.description ? (
        <p className="preview-desc">{display.description}</p>
      ) : null}

      <div className="preview-col-head">
        <span aria-hidden="true" className="dot" />
        <span>{t('toolsList.previewInput')}</span>
        <DirectiveChips input={input} onReplace={replaceInputAt} />
        <ShareLinkButton
          data-testid="copy-tool-share-link"
          disabled={privateInput}
          disabledLabel={t('shareLink.privateInput')}
          getShareLink={() =>
            buildShareLink({
              box: source.id ?? source.name,
              input,
              pathname: '/boxes',
            })
          }
        />
      </div>
      <div className="preview-input-card">
        <DirectiveAutocomplete
          aria-label={t('toolsList.previewInput')}
          className="mono"
          data-magic-input="true"
          onChange={setInput}
          onReplace={replaceInputAt}
          rows={Math.min(8, Math.max(3, input.split('\n').length + 1))}
          spellCheck={false}
          textareaRef={inputRef}
          value={input}
        />
      </div>

      <div className="preview-col-head">
        <span aria-hidden="true" className="dot" />
        <span>{t('toolsList.previewOutput')}</span>
      </div>
      <div className="boxes">
        {/* The real box, so the preview can never describe a tool that no
            longer behaves that way — but flagged as a demonstration, so a box
            that would reach the network on mount does not do it for a user who
            is only browsing the list. */}
        <BoxPreviewProvider>
          <MagicBox
            input={magicIn}
            liveInput={input}
            onPasteInput={pasteInput}
            sources={sources}
          />
        </BoxPreviewProvider>
      </div>
    </div>
  );
};

export default PreviewPane;
