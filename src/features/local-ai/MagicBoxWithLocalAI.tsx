import { lazy, Suspense, useState } from 'react';
import { useLocale } from '../../contexts/LocaleContext';
import { enterLocalAIPrivacy } from '../../functions/localAIPrivacy';
import MagicBoxPage from '../../pages/MagicBox/MagicBoxPage';
import { localAIStrings } from './strings';
import './local-ai.css';

const LocalAIPanel = lazy(() => import('./LocalAIPanel'));

export default function MagicBoxWithLocalAI() {
  const { locale } = useLocale();
  const text = localAIStrings(locale);
  const [mode, setMode] = useState<'tools' | 'ai'>('tools');
  return (
    <>
      <fieldset className="local-ai-mode" aria-label={text.mode}>
        <div className="seg">
          <button type="button" className={`seg-item${mode === 'tools' ? ' active' : ''}`}
            aria-pressed={mode === 'tools'} onClick={() => setMode('tools')}>
            {text.tools}
          </button>
          <button type="button" className={`seg-item${mode === 'ai' ? ' active' : ''}`}
            aria-pressed={mode === 'ai'} onClick={() => {
              enterLocalAIPrivacy();
              setMode('ai');
            }}>
            {text.title}
          </button>
        </div>
      </fieldset>
      {mode === 'tools' ? <MagicBoxPage /> : (
        <Suspense fallback={<div className="loader" />}>
          <LocalAIPanel />
        </Suspense>
      )}
    </>
  );
}
