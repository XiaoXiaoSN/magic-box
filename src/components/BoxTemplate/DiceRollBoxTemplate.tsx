import type { BoxOptions, BoxProps } from '@modules/Box';
import { diceOptions, dicePlaintext, rollDice } from '@modules/dice';
import type { CSSProperties } from 'react';
import {
  memo,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useLocale } from '../../contexts/LocaleContext';

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

interface DiceLayout {
  width: number;
  columns: number;
  height: number;
}

interface DiceLayoutTargets {
  cubes: string[];
  shadows: string[];
}

const layoutForWidth = (width: number, rollCount: number): DiceLayout => {
  const columns = Math.max(1, Math.floor((width - 32) / 94));
  return {
    width,
    columns,
    height: Math.max(280, Math.ceil(rollCount / columns) * 112 + 84),
  };
};

const layoutTargets = (
  layout: DiceLayout,
  rolls: number[],
): DiceLayoutTargets => {
  const cubes: string[] = [];
  const shadows: string[] = [];
  const rowCount = Math.ceil(rolls.length / layout.columns);
  for (const [index, roll] of rolls.entries()) {
    const row = Math.floor(index / layout.columns);
    const currentRowCount = Math.min(
      layout.columns,
      rolls.length - row * layout.columns,
    );
    const x = ((index % layout.columns) - (currentRowCount - 1) / 2) * 94;
    const y = (row - (rowCount - 1) / 2) * 112;
    cubes.push(`translate3d(${x}px, ${y}px, 0px) ${ROTATIONS[roll]}`);
    shadows.push(`translate(${x}px, ${y + 40}px) scale(1)`);
  }
  return { cubes, shadows };
};

const applyLayout = (
  element: HTMLElement,
  layout: DiceLayout,
  rolls: number[],
): DiceLayoutTargets => {
  const targets = layoutTargets(layout, rolls);
  const cubes = element.querySelectorAll<HTMLElement>('.dice-roll-slot');
  const shadows = element.querySelectorAll<HTMLElement>('.dice-roll-shadow');
  for (const [index, target] of targets.cubes.entries()) {
    cubes[index]?.style.setProperty('transform', target);
    shadows[index]?.style.setProperty('transform', targets.shadows[index]);
  }
  return targets;
};

const DiceRollBoxTemplateComponent = ({
  options,
  onClick,
  onResultChange,
}: BoxProps): React.JSX.Element => {
  const { t } = useLocale();
  const tray = useRef<HTMLDivElement>(null);
  const [localResult, setLocalResult] = useState<{
    source: BoxOptions;
    options: Record<string, string>;
  } | null>(null);
  const currentOptions =
    localResult?.source === options ? localResult.options : options;
  const rollsValue = String(currentOptions?.Rolls ?? '[]');
  const total = String(currentOptions?.Total ?? '0');
  const rolls = useMemo<number[]>(
    () => JSON.parse(rollsValue) as number[],
    [rollsValue],
  );
  const [rerollGeneration, setRerollGeneration] = useState(0);
  const rollIdentity = useMemo(
    () => ({
      options,
      rerollGeneration,
      rollsValue,
      total,
    }),
    [options, rerollGeneration, rollsValue, total],
  );
  const [phase, setPhase] = useState<'rolling' | 'gathering' | 'ready'>(
    'rolling',
  );
  const [layout, setLayout] = useState<DiceLayout>(() =>
    layoutForWidth(320, rolls.length),
  );
  const layoutRef = useRef(layout);

  useLayoutEffect(() => {
    const element = tray.current;
    if (!element) return;
    const measuredWidth = Math.round(
      element.getBoundingClientRect().width ||
        element.clientWidth ||
        layoutRef.current.width,
    );
    const nextLayout = layoutForWidth(measuredWidth, rolls.length);
    layoutRef.current = nextLayout;
    setLayout((previous) =>
      previous.width === nextLayout.width &&
      previous.columns === nextLayout.columns &&
      previous.height === nextLayout.height
        ? previous
        : nextLayout,
    );
  }, [rolls.length]);

  useEffect(() => {
    const element = tray.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const measuredWidth = Math.round(
        entry?.contentRect.width ||
          element.getBoundingClientRect().width ||
          element.clientWidth ||
          layoutRef.current.width,
      );
      const nextLayout = layoutForWidth(measuredWidth, rolls.length);
      layoutRef.current = nextLayout;
      applyLayout(element, nextLayout, rolls);
      setLayout((previous) =>
        previous.width === nextLayout.width &&
        previous.columns === nextLayout.columns &&
        previous.height === nextLayout.height
          ? previous
          : nextLayout,
      );
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [rolls]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: rollIdentity covers upstream and local rerolls
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
    applyLayout(element, layoutRef.current, rolls);
    const stop = () => {
      controller.abort();
      for (const animation of animations) animation.cancel();
      applyLayout(element, layoutRef.current, rolls);
      for (const cube of cubes) cube.style.visibility = '';
    };
    const preferenceChanged = () => {
      if (media.matches) {
        stop();
        setPhase('ready');
      }
    };
    media.addEventListener('change', preferenceChanged);
    if (media.matches) {
      applyLayout(element, layoutRef.current, rolls);
      setPhase('ready');
    } else {
      setPhase('rolling');
      for (const cube of cubes) cube.style.visibility = 'hidden';
      void (async () => {
        try {
          const { simulateDiceThrow, diceTransform } = await import(
            './dicePhysics'
          );
          if (controller.signal.aborted) return;
          const simulation = await simulateDiceThrow(
            rolls,
            layoutRef.current.width,
            layoutRef.current.height,
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
          const gatheringTargets = applyLayout(
            element,
            layoutRef.current,
            rolls,
          );
          await Promise.all(
            cubes.map((cube, index) => {
              const pose = lastFrame[index];
              const shadow = shadows[index].animate(
                [
                  {
                    transform: `translate(${pose.x * 64}px, ${pose.y * 64 * Math.cos(Math.PI / 8) + 20}px) scale(${1 + pose.z * 0.12})`,
                    opacity: 0.55 / (1 + pose.z * 0.3),
                  },
                  {
                    transform: gatheringTargets.shadows[index],
                    opacity: 0.5,
                  },
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
                  { transform: gatheringTargets.cubes[index] },
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
          applyLayout(element, layoutRef.current, rolls);
          setPhase('ready');
        } catch (error) {
          if (!controller.signal.aborted) {
            console.error('Dice animation failed:', error);
            for (const animation of animations) animation.cancel();
            applyLayout(element, layoutRef.current, rolls);
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
    // The options identity catches a fresh upstream result; the generation token
    // keeps an identical local reroll animated.
  }, [rollIdentity, rolls]);

  const reroll = () => {
    const next = diceOptions(rollDice(rolls.length));
    setPhase('rolling');
    setRerollGeneration((generation) => generation + 1);
    setLocalResult({ source: options, options: next });
    onResultChange?.({ options: next, plaintextOutput: dicePlaintext(next) });
  };

  return (
    <div className="dice-roll-template" data-testid="magic-box-dice-roll">
      <div className="dice-roll-heading">
        <span>
          {rolls.length} {rolls.length === 1 ? t('dice.die') : t('dice.dice')}{' '}
          <span className="dice-roll-muted">/ {t('dice.sixSided')}</span>
        </span>
        <span className="dice-roll-muted">
          {phase === 'rolling'
            ? t('dice.rolling')
            : phase === 'gathering'
              ? t('dice.gathering')
              : t('dice.ready')}
        </span>
      </div>
      <div
        className="dice-roll-tray"
        ref={tray}
        data-phase={phase}
        style={{ height: layout.height }}
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
                ? t('dice.ariaReady', { index: index + 1, value: roll })
                : t('dice.ariaRolling', { index: index + 1 })
            }
          >
            <div className="dice-roll-view">
              <div className="dice-roll-cube">
                {FACES.map((face) => (
                  <div
                    className="dice-roll-face"
                    data-result={face.value === roll}
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
              ? t('dice.total')
              : phase === 'rolling'
                ? t('dice.rolling')
                : t('dice.gathering')}
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
          {t('dice.reroll')}
        </button>
        <button
          type="button"
          disabled={phase !== 'ready'}
          onClick={(event) => {
            event.stopPropagation();
            onClick(total);
          }}
          aria-label={t('dice.copyTotal', { total })}
        >
          {t('dice.copyTotalButton')}
        </button>
      </div>
    </div>
  );
};

export const DiceRollBoxTemplate = memo(DiceRollBoxTemplateComponent);
export default DiceRollBoxTemplate;
