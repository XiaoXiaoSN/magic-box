import { compareTexts } from '@functions/textDiff';
import type { BoxProps } from '@modules/Box';
import { useLocale } from '../../contexts/LocaleContext';
import CodeBoxTemplate from './CodeBoxTemplate';

function DiffBoxTemplate({
  sourceInput = '',
  options,
  plaintextOutput,
  onClick,
  onResultChange,
  ...props
}: BoxProps) {
  const { t } = useLocale();
  const { diffTarget, diffError, ...otherOptions } = options ?? {};
  const target = String(diffTarget ?? '');
  const compare = () => {
    const next = compareTexts(sourceInput, target);
    onResultChange?.({
      options: next.ok
        ? { ...otherOptions, diffTarget: target }
        : { ...otherOptions, diffTarget: target, diffError: next.message },
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
          onChange={(event) =>
            onResultChange?.({
              options: { ...otherOptions, diffTarget: event.target.value },
              plaintextOutput: '',
            })
          }
        />
      </label>
      <button className="btn-subtle" type="button" onClick={compare}>
        {t('diff.compare')}
      </button>
      {diffError ? <p role="alert">{diffError}</p> : null}
      {plaintextOutput ? (
        <>
          <p role="status">{t('diff.result')}</p>
          <CodeBoxTemplate
            {...props}
            onClick={onClick}
            options={{ language: 'diff' }}
            plaintextOutput={plaintextOutput}
          />
          <button
            className="btn-subtle"
            type="button"
            onClick={() => onClick(plaintextOutput)}
          >
            {t('diff.copy')}
          </button>
        </>
      ) : null}
    </div>
  );
}

export default DiffBoxTemplate;
