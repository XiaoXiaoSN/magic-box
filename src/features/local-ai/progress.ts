export interface ProgressReporter {
  report(progress: number | null, final?: boolean): void;
  hasAggregate: boolean;
}

export function createProgressReporter(
  send: (progress: number | null) => void,
  now: () => number = () => performance.now(),
): ProgressReporter {
  let lastAt = Number.NEGATIVE_INFINITY;
  let lastPercent: number | null = null;
  let hasAggregate = false;

  return {
    get hasAggregate() {
      return hasAggregate;
    },
    report(progress, final = false) {
      if (progress !== null) hasAggregate = true;
      const percent = progress === null ? null : Math.floor(progress);
      if (!final && percent === lastPercent && now() - lastAt < 250) {
        return;
      }
      lastAt = now();
      lastPercent = percent;
      send(percent);
    },
  };
}
