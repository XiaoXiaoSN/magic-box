import type { ComputeWorkerSource, ResolveComputeWorkerSource } from './entry';

type WorkerSourceLoader = () => Promise<ComputeWorkerSource>;

/** keeps the worker graph limited to the source implementations that can run there. */
export const workerSourceIds = [
  'base64-decode',
  'cron-expression',
  'data-converter',
  'json-tools',
  'date-calculate',
  'math-expression',
  'now',
  'timestamp',
  'base64-encode',
  'sort-lines',
  'unit-converter',
  'week-number',
  'pbkdf2',
] as const;

const loadBase64Sources = () => import('@modules/boxSources/Base64BoxSource');

const workerLoaders = new Map<string, WorkerSourceLoader>([
  [
    'base64-decode',
    () => loadBase64Sources().then((module) => module.Base64DecodeBoxSource),
  ],
  [
    'cron-expression',
    () =>
      import('@modules/boxSources/CronExpressionBoxSource').then(
        (module) => module.default,
      ),
  ],
  [
    'data-converter',
    () =>
      import('@modules/boxSources/DataConverterBoxSource').then(
        (module) => module.default,
      ),
  ],
  [
    'json-tools',
    () =>
      import('@modules/boxSources/JsonToolsBoxSource').then(
        (module) => module.default,
      ),
  ],
  [
    'date-calculate',
    () =>
      import('@modules/boxSources/DateCalculateBoxSource').then(
        (module) => module.default,
      ),
  ],
  [
    'math-expression',
    () =>
      import('@modules/boxSources/MathExpressionBoxSource').then(
        (module) => module.default,
      ),
  ],
  [
    'now',
    () =>
      import('@modules/boxSources/NowBoxSource').then(
        (module) => module.default,
      ),
  ],
  [
    'timestamp',
    () =>
      import('@modules/boxSources/TimestampBoxSource').then(
        (module) => module.default,
      ),
  ],
  [
    'base64-encode',
    () => loadBase64Sources().then((module) => module.Base64EncodeBoxSource),
  ],
  [
    'sort-lines',
    () =>
      import('@modules/boxSources/SortLinesBoxSource').then(
        (module) => module.default,
      ),
  ],
  [
    'unit-converter',
    () =>
      import('@modules/boxSources/UnitConverterBoxSource').then(
        (module) => module.default,
      ),
  ],
  [
    'week-number',
    () =>
      import('@modules/boxSources/WeekNumberBoxSource').then(
        (module) => module.default,
      ),
  ],
  [
    'pbkdf2',
    () =>
      import('@modules/boxSources/Pbkdf2BoxSource').then(
        (module) => module.default,
      ),
  ],
]);
const workerSources = new Map<string, Promise<ComputeWorkerSource>>();

export function registerComputeWorkerSource(
  sourceId: string,
  source: ComputeWorkerSource,
): void {
  workerSources.set(sourceId, Promise.resolve(source));
}

/** resolves only explicitly worker-safe sources and retries failed lazy loads. */
export const resolveComputeWorkerSource: ResolveComputeWorkerSource = async (
  sourceId,
): Promise<ComputeWorkerSource | null> => {
  const cached = workerSources.get(sourceId);
  if (cached !== undefined) return cached;

  const load = workerLoaders.get(sourceId);
  if (load === undefined) return null;

  const pending = load().catch((error: unknown) => {
    workerSources.delete(sourceId);
    throw error;
  });
  workerSources.set(sourceId, pending);
  return pending;
};
