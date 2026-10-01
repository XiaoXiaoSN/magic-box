import { compareTexts, type DiffOutcome } from '@functions/textDiff';
import type { BoxProps } from '@modules/Box';
import { useState } from 'react';
import { useLocale } from '../../contexts/LocaleContext';
import CodeBoxTemplate from './CodeBoxTemplate';

function DiffBoxTemplate({
  sourceInput = '',
  options,
  onClick,
  onResultChange,
  ...props
}: BoxProps) {
  const { t } = useLocale();
  const [target, setTarget] = useState(String(options?.diffTarget ?? ''));
  const [comparison, setComparison] = useState<{
    source: string;
    result: DiffOutcome;
  } | null>(null);
  const result = comparison?.source === sourceInput ? comparison.result : null;
  const output = result?.ok ? result.output : '';
  const compare = () => {
    const next = compareTexts(sourceInput, target);
    setComparison({ source: sourceInput, result: next });
    onResultChange?.({
      options: { ...options, diffTarget: target },
      plaintextOutput: next.ok ? next.output : '',
    });
  };

  return (
    <div>
      <p>{t('diff.original')}</p>
      <CodeBoxTemplate
        {...props}
        onClick={onClick}
        options={options}
        plaintextOutput={sourceInput}
      />
      <label style={{ display: 'block', marginTop: 12 }}>
        {t('diff.target')}
        <textarea
          className="mono"
          value={target}
          rows={6}
          maxLength={20_000}
          style={{
            display: 'block',
            width: '100%',
            boxSizing: 'border-box',
            background: 'transparent',
            color: 'inherit',
          }}
          onKeyDown={(event) => event.stopPropagation()}
          onChange={(event) => {
            setTarget(event.target.value);
            setComparison(null);
            onResultChange?.({
              options: { ...options, diffTarget: event.target.value },
              plaintextOutput: '',
            });
          }}
        />
      </label>
      <button className="btn-subtle" type="button" onClick={compare}>
        {t('diff.compare')}
      </button>
      {result && !result.ok && <p role="alert">{result.message}</p>}
      {output && (
        <>
          <p role="status">{t('diff.result')}</p>
          <CodeBoxTemplate
            {...props}
            onClick={onClick}
            options={{ language: 'diff' }}
            plaintextOutput={output}
          />
          <button
            className="btn-subtle"
            type="button"
            onClick={() => onClick(output)}
          >
            {t('diff.copy')}
          </button>
        </>
      )}
    </div>
  );
}

DiffBoxTemplate.supportsLarge = true;
export default DiffBoxTemplate;
