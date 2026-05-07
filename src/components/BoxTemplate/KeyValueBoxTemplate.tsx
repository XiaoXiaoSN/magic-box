import type { BoxProps } from '@modules/Box';
import { memo, useMemo } from 'react';

const KeyValueBoxTemplateComponent = ({
  plaintextOutput,
  options,
  onClick,
  largeModal = false,
}: BoxProps): React.JSX.Element => {
  const data = useMemo(() => {
    const result: Record<string, string> = {};

    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        result[key] = value as string;
      });
    }
    if (plaintextOutput) {
      try {
        const parsedOutput = JSON.parse(plaintextOutput);
        Object.entries(parsedOutput).forEach(([key, value]) => {
          result[key] = value as string;
        });
      } catch {
        /* */
      }
    }

    return result;
  }, [plaintextOutput, options]);

  const handleValueClick = (e: React.MouseEvent, value: string) => {
    e.stopPropagation();
    onClick(value);
  };

  return (
    <div
      className="kv-table"
      data-testid="magic-box-result-text"
      style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        rowGap: 6,
        columnGap: 18,
        maxHeight: largeModal ? '60vh' : '300px',
        overflow: 'auto',
      }}
    >
      {Object.entries(data).map(([key, value]) => (
        <div
          key={key}
          data-testid={`magic-box-key-value-pair-${key}`}
          style={{ display: 'contents' }}
        >
          <span
            className="kv-label"
            data-testid={`magic-box-key-${key}`}
            style={{
              fontSize: 11,
              color: 'var(--ink-4)',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              paddingTop: 2,
              wordBreak: 'break-all',
            }}
            title={key}
          >
            {key}
          </span>
          <button
            className="kv-value mono"
            data-testid={`magic-box-value-${key}`}
            onClick={(e) => handleValueClick(e, String(value))}
            type="button"
            style={{
              fontSize: 13,
              color: 'var(--ink)',
              wordBreak: 'break-all',
              whiteSpace: 'pre-wrap',
              textAlign: 'left',
              padding: 0,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {String(value)}
          </button>
        </div>
      ))}
    </div>
  );
};

const KeyValueBoxTemplate = Object.assign(memo(KeyValueBoxTemplateComponent), {
  supportsLarge: true,
});

export default KeyValueBoxTemplate;
