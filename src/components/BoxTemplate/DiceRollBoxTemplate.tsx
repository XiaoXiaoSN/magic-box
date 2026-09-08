import type { BoxOptions, BoxProps } from '@modules/Box';
import { diceOptions, dicePlaintext, rollDice } from '@modules/dice';
import type { CSSProperties } from 'react';
import { memo, useEffect, useMemo, useRef, useState } from 'react';

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
  onResultChange,
}: BoxProps): React.JSX.Element => {
  const tray = useRef<HTMLDivElement>(null);
  const [localResult, setLocalResult] = useState<{
    source: BoxOptions;
    options: Record<string, string>;
  } | null>(null);
  const currentOptions =
    localResult?.source === options ? localResult.options : options;
  const rolls = useMemo<number[]>(
    () => JSON.parse(String(currentOptions?.Rolls ?? '[]')),
    [currentOptions],
  );
  const total = String(currentOptions?.Total ?? '0');
  const [phase, setPhase] = useState<'rolling' | 'gathering' | 'ready'>(
    'rolling',
  );
  const [width, setWidth] = useState(320);
  const columns = Math.max(1, Math.floor((width - 32) / 94));
  const height = Math.max(280, Math.ceil(rolls.length / columns) * 112 + 84);

  useEffect(() => {
    const element = tray.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.round(entry.contentRect.width)),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const element = tray.current;
    if (!element) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const controller = new AbortController();
    const animations: Animation[] = [];
    const cubes = Array.from(
      element.querySelectorAll<HTMLElement>('.dice-roll-slot'),
    );
    const shadows = Array.from(
      element.querySelectorAll<HTMLElement>('.dice-roll-shadow'),
    );
    const shadowTargets: string[] = [];
    const targets = cubes.map((cube, index) => {
      const row = Math.floor(index / columns);
      const rowCount = Math.min(columns, rolls.length - row * columns);
      const x = ((index % columns) - (rowCount - 1) / 2) * 94;
      const y = (row - (Math.ceil(rolls.length / columns) - 1) / 2) * 112;
      const target = `translate3d(${x}px, ${y}px, 0px) rotateX(-40deg) rotateY(-22deg) rotateX(90deg) ${ROTATIONS[rolls[index]]}`;
      cube.style.transform = target;
      const shadowTarget = `translate(${x}px, ${y + 40}px) scale(1)`;
      shadows[index].style.transform = shadowTarget;
      shadowTargets.push(shadowTarget);
      return target;
    });
    const stop = () => {
      controller.abort();
      for (const animation of animations) animation.cancel();
      for (const cube of cubes) cube.style.visibility = '';
    };
    const preferenceChanged = () => {
      if (media.matches) {
        stop();
        setPhase('ready');
      }
    };
    media.addEventListener('change', preferenceChanged);
    if (media.matches) setPhase('ready');
    else {
      setPhase('rolling');
      for (const cube of cubes) cube.style.visibility = 'hidden';
      void (async () => {
        try {
          const { simulateDiceThrow, diceTransform } = await import(
            './dicePhysics'
          );
          const simulation = await simulateDiceThrow(
            rolls,
            width,
            height,
            controller.signal,
          );
          controller.signal.throwIfAborted();
          const throws = cubes.map((cube, index) => {
            cube.style.visibility = '';
            const shadow = shadows[index].animate(
              simulation.frames.map((frame) => ({
                transform: `translate(${frame[index].x * 64}px, ${frame[index].y * 64 * Math.cos(Math.PI / 8) + 20}px) scale(${1 + frame[index].z * 0.12})`,
                opacity: 0.55 / (1 + frame[index].z * 0.3),
              })),
              {
                duration: (simulation.frames.length / 60) * 1000,
                fill: 'forwards',
                easing: 'linear',
              },
            );
            animations.push(shadow);
            const animation = cube.animate(
              simulation.frames.map((frame) => ({
                transform: diceTransform(
                  frame[index],
                  simulation.corrections[index],
                ),
              })),
              {
                duration: (simulation.frames.length / 60) * 1000,
                fill: 'forwards',
                easing: 'linear',
              },
            );
            animations.push(animation);
            return animation.finished;
          });
          await Promise.all(throws);
          controller.signal.throwIfAborted();
          setPhase('gathering');
          const lastFrame = simulation.frames[simulation.frames.length - 1];
          await Promise.all(
            cubes.map((cube, index) => {
              const pose = lastFrame[index];
              const shadow = shadows[index].animate(
                [
                  {
                    transform: `translate(${pose.x * 64}px, ${pose.y * 64 * Math.cos(Math.PI / 8) + 20}px) scale(${1 + pose.z * 0.12})`,
                    opacity: 0.55 / (1 + pose.z * 0.3),
                  },
                  { transform: shadowTargets[index], opacity: 0.5 },
                ],
                {
                  duration: 850,
                  delay: index * 35,
                  fill: 'forwards',
                  easing: 'cubic-bezier(.3,0,.2,1)',
                },
              );
              animations.push(shadow);
              const animation = cube.animate(
                [
                  {
                    transform: diceTransform(
                      pose,
                      simulation.corrections[index],
                    ),
                  },
                  {
                    transform: diceTransform(
                      { ...pose, z: pose.z + 1.5 },
                      simulation.corrections[index],
                    ),
                    offset: 0.3,
                  },
                  { transform: targets[index] },
                ],
                {
                  duration: 850,
                  delay: index * 35,
                  fill: 'forwards',
                  easing: 'cubic-bezier(.3,0,.2,1)',
                },
              );
              animations.push(animation);
              return animation.finished;
            }),
          );
          controller.signal.throwIfAborted();
          for (const animation of animations) animation.cancel();
          setPhase('ready');
        } catch (error) {
          if (!controller.signal.aborted) {
            console.error('Dice animation failed:', error);
            for (const animation of animations) animation.cancel();
            for (const cube of cubes) cube.style.visibility = '';
            setPhase('ready');
          }
        }
      })();
    }
    return () => {
      stop();
      media.removeEventListener('change', preferenceChanged);
    };
  }, [rolls, width, height, columns]);

  const reroll = () => {
    const next = diceOptions(rollDice(rolls.length));
    setPhase('rolling');
    setLocalResult({ source: options, options: next });
    onResultChange?.({ options: next, plaintextOutput: dicePlaintext(next) });
  };

  return (
    <div className="dice-roll-template" data-testid="magic-box-dice-roll">
      <div className="dice-roll-heading">
        <span>
          {rolls.length} {rolls.length === 1 ? 'die' : 'dice'}{' '}
          <span className="dice-roll-muted">/ six-sided</span>
        </span>
        <span className="dice-roll-muted">
          {phase === 'rolling'
            ? 'Rolling…'
            : phase === 'gathering'
              ? 'Gathering dice…'
              : 'Your roll'}
        </span>
      </div>
      <div
        className="dice-roll-tray"
        ref={tray}
        data-phase={phase}
        style={{ height }}
        aria-busy={phase !== 'ready'}
      >
        {rolls.map((_, index) => (
          <i
            key={`shadow-${String(index)}`}
            className="dice-roll-shadow"
            aria-hidden="true"
          />
        ))}
        {rolls.map((roll, index) => (
          <div
            className="dice-roll-slot"
            key={`die-${String(index)}`}
            role="img"
            aria-label={
              phase === 'ready'
                ? `Die ${index + 1}: ${roll}`
                : `Die ${index + 1}: rolling`
            }
          >
            <div className="dice-roll-view">
              <div className="dice-roll-cube">
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
          </div>
        ))}
      </div>
      <div className="dice-roll-footer">
        <div role="status" aria-live="polite">
          <span className="dice-roll-muted">
            {phase === 'ready'
              ? 'Total'
              : phase === 'rolling'
                ? 'Rolling…'
                : 'Gathering dice…'}
          </span>
          {phase === 'ready' && <strong>{total}</strong>}
          {phase === 'ready' && rolls.length > 1 && (
            <span className="dice-roll-equation">{rolls.join(' + ')}</span>
          )}
        </div>
        <button
          type="button"
          className="dice-roll-again"
          disabled={phase !== 'ready'}
          onClick={(event) => {
            event.stopPropagation();
            reroll();
          }}
        >
          Re-roll
        </button>
        <button
          type="button"
          disabled={phase !== 'ready'}
          onClick={(event) => {
            event.stopPropagation();
            onClick(total);
          }}
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
