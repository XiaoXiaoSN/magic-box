import type { BoxProps } from '@modules/Box';
import { memo, useMemo } from 'react';

const PIP_MAP: Record<number, string> = {
  1: '⚀',
  2: '⚁',
  3: '⚂',
  4: '⚃',
  5: '⚄',
  6: '⚅',
};

const DiceRollBoxTemplateComponent = ({
  options,
  onClick,
}: BoxProps): React.JSX.Element => {
  const data = useMemo(() => {
    const notation = (options?.Notation as string) || '';
    const rollsStr = (options?.Rolls as string) || '[]';
    const sum = (options?.Sum as string) || '0';
    const modifier = (options?.Modifier as string) || '0';
    const total = (options?.Total as string) || '0';

    let rolls: number[] = [];
    try {
      rolls = JSON.parse(rollsStr) as number[];
    } catch {
      /* fallback */
    }

    return { notation, rolls, sum, modifier, total };
  }, [options]);

  const handleCopy = (val: string) => {
    onClick(val);
  };

  return (
    <div
      className="dice-roll-template"
      data-testid="magic-box-dice-roll"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: '4px 0',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--ink-4)',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          {data.notation || 'DICE ROLL'}
        </span>
        <button
          type="button"
          onClick={() => handleCopy(data.total)}
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: 'var(--accent, #6366f1)',
            background: 'var(--accent-bg, rgba(99, 102, 241, 0.1))',
            padding: '4px 12px',
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
          }}
          title="Click to copy total"
        >
          Total: {data.total}
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          alignItems: 'center',
        }}
      >
        {data.rolls.map((roll, idx) => {
          const keyId = `dice-roll-val-${roll}-item-${String(idx)}`;
          return (
            <div
              key={keyId}
              style={{
                width: 38,
                height: 38,
                borderRadius: 8,
                border: '1px solid var(--border-color, #ccc)',
                background: 'var(--bg-card, #ffffff)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: PIP_MAP[roll] ? 24 : 14,
                fontWeight: 700,
                color: 'var(--ink)',
                transition: 'transform 0.15s ease',
              }}
              title={`Die #${idx + 1}: ${roll}`}
            >
              {PIP_MAP[roll] || roll}
            </div>
          );
        })}
        {data.modifier !== '0' && (
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--ink-3, #666)',
              marginLeft: 4,
            }}
          >
            ({data.modifier > '0' ? `+${data.modifier}` : data.modifier})
          </span>
        )}
      </div>
    </div>
  );
};

export const DiceRollBoxTemplate = Object.assign(
  memo(DiceRollBoxTemplateComponent),
  {
    supportsLarge: false,
  },
);

export default DiceRollBoxTemplate;
