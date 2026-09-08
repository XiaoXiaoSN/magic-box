import type { BoxProps } from '@modules/Box';
import type { CSSProperties } from 'react';
import { memo, useEffect, useMemo, useRef } from 'react';

import './DiceRollBoxTemplate.css';

const FACES = [
  { value: 1, transform: 'translateZ(32px)', pips: [5] },
  {
    value: 6,
    transform: 'rotateY(180deg) translateZ(32px)',
    pips: [1, 3, 4, 6, 7, 9],
  },
  { value: 2, transform: 'rotateY(90deg) translateZ(32px)', pips: [1, 9] },
  {
    value: 5,
    transform: 'rotateY(-90deg) translateZ(32px)',
    pips: [1, 3, 5, 7, 9],
  },
  { value: 3, transform: 'rotateX(90deg) translateZ(32px)', pips: [1, 5, 9] },
  {
    value: 4,
    transform: 'rotateX(-90deg) translateZ(32px)',
    pips: [1, 3, 7, 9],
  },
];
const ROTATIONS: Record<number, string> = {
  1: 'rotateX(0deg) rotateY(0deg)',
  2: 'rotateX(0deg) rotateY(-90deg)',
  3: 'rotateX(-90deg) rotateY(0deg)',
  4: 'rotateX(90deg) rotateY(0deg)',
  5: 'rotateX(0deg) rotateY(90deg)',
  6: 'rotateX(0deg) rotateY(180deg)',
};

const DiceRollBoxTemplateComponent = ({
  options,
  onClick,
}: BoxProps): React.JSX.Element => {
  const tray = useRef<HTMLDivElement>(null);
  const rolls = useMemo<number[]>(
    () => JSON.parse(String(options?.Rolls ?? '[]')),
    [options],
  );
  const total = String(options?.Total ?? '0');

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (media.matches) return;
    const animations = Array.from(
      tray.current?.querySelectorAll<HTMLElement>('.dice-roll-cube') ?? [],
    ).map((cube, index) =>
      cube.animate(
        [
          {
            transform: `translateY(-38px) rotateX(660deg) rotateY(620deg) ${ROTATIONS[rolls[index]]}`,
          },
          {
            transform: `translateY(-12px) rotateX(100deg) rotateY(70deg) ${ROTATIONS[rolls[index]]}`,
            offset: 0.65,
          },
          {
            transform: `translateY(0px) rotateX(0deg) rotateY(0deg) ${ROTATIONS[rolls[index]]}`,
          },
        ],
        {
          duration: 1100,
          delay: index * 35,
          easing: 'cubic-bezier(.2,.65,.3,1)',
          fill: 'backwards',
        },
      ),
    );
    const stop = () => {
      if (media.matches)
        animations.forEach((animation) => {
          animation.cancel();
        });
    };
    media.addEventListener('change', stop);
    return () => {
      media.removeEventListener('change', stop);
      animations.forEach((animation) => {
        animation.cancel();
      });
    };
  }, [rolls]);

  return (
    <div className="dice-roll-template" data-testid="magic-box-dice-roll">
      <div className="dice-roll-heading">
        <span>
          {rolls.length} {rolls.length === 1 ? 'die' : 'dice'}{' '}
          <span className="dice-roll-muted">/ six-sided</span>
        </span>
        <span className="dice-roll-muted">Your roll</span>
      </div>
      <div className="dice-roll-tray" ref={tray}>
        {rolls.map((roll, index) => (
          <div
            className="dice-roll-slot"
            key={`die-${String(index)}`}
            role="img"
            aria-label={`Die ${index + 1}: ${roll}`}
          >
            <div className="dice-roll-view">
              <div
                className="dice-roll-cube"
                style={{ transform: ROTATIONS[roll] }}
              >
                {FACES.map((face) => (
                  <div
                    className="dice-roll-face"
                    key={face.value}
                    style={{ transform: face.transform }}
                    aria-hidden="true"
                  >
                    {face.pips.map((position) => (
                      <i
                        className="dice-roll-pip"
                        key={position}
                        style={
                          {
                            '--pip-row': Math.ceil(position / 3),
                            '--pip-column': ((position - 1) % 3) + 1,
                          } as CSSProperties
                        }
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <span className="dice-roll-value" aria-hidden="true">
              {roll}
            </span>
          </div>
        ))}
      </div>
      <div className="dice-roll-footer">
        <div role="status" aria-live="polite">
          <span className="dice-roll-muted">Total</span>
          <strong>{total}</strong>
          {rolls.length > 1 && (
            <span className="dice-roll-equation">{rolls.join(' + ')}</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => onClick(total)}
          aria-label={`Copy total: ${total}`}
        >
          Copy total
        </button>
      </div>
    </div>
  );
};

export const DiceRollBoxTemplate = Object.assign(
  memo(DiceRollBoxTemplateComponent),
  { supportsLarge: false },
);
export default DiceRollBoxTemplate;
