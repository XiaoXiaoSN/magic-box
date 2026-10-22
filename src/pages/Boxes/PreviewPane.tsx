import MagicBox from '@components/MagicBox';
import ShareLinkButton from '@components/ShareLinkButton';
import { buildShareLink } from '@functions/shareLink';
import type { BoxSource } from '@modules/BoxSource';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BoxPreviewProvider } from '../../contexts/BoxPreviewContext';
import { useLocale } from '../../contexts/LocaleContext';
import { getSourceDisplay } from './display';

interface PreviewPaneProps {
  source: BoxSource;
}

const PreviewPane = ({ source }: PreviewPaneProps): React.JSX.Element => {
  const { t } = useLocale();
  const display = getSourceDisplay(source, t);
  const [params] = useSearchParams();
  const [input, setInput] = useState(() =>
    params.get('box') === source.name
      ? (params.get('input') ?? source.defaultInput)
      : source.defaultInput,
  );
  const [magicIn, setMagicIn] = useState('');
  const sources = useMemo(() => [source], [source]);

  useEffect(() => {
    const id = window.setTimeout(() => setMagicIn(input), 400);
    return () => window.clearTimeout(id);
  }, [input]);

  return (
    <div className="preview-stack">
      <div className="preview-meta">
        <h2 className="preview-title" title={display.description}>
          {display.name}
        </h2>
        {display.kind ? (
          <span className="preview-kind">{display.kind}</span>
        ) : null}
      </div>

      <div className="preview-col-head">
        <span aria-hidden="true" className="dot" />
        <span>{t('toolsList.previewInput')}</span>
        <ShareLinkButton
          data-testid="copy-tool-share-link"
          getShareLink={() =>
            buildShareLink({
              box: source.name,
              input,
              pathname: '/boxes',
            })
          }
        />
      </div>
      <div className="preview-input-card">
        <textarea
          aria-label={t('toolsList.previewInput')}
          className="mono"
          onChange={(e) => setInput(e.target.value)}
          rows={Math.min(8, Math.max(3, input.split('\n').length + 1))}
          spellCheck={false}
          value={input}
        />
      </div>

      <div className="preview-col-head">
        <span aria-hidden="true" className="dot" />
        <span>{t('toolsList.previewOutput')}</span>
      </div>
      <div className="boxes">
        {/* preview mode prevents network work from starting while browsing. */}
        <BoxPreviewProvider>
          <MagicBox input={magicIn} onPasteInput={setInput} sources={sources} />
        </BoxPreviewProvider>
      </div>
    </div>
  );
};

export default PreviewPane;
