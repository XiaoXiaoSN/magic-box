import {
  Base64DecodeBoxSource,
  Base64EncodeBoxSource,
} from '@modules/boxSources/Base64BoxSource';
import CronExpressionBoxSource from '@modules/boxSources/CronExpressionBoxSource';
import DataConverterBoxSource from '@modules/boxSources/DataConverterBoxSource';
import DateCalculateBoxSource from '@modules/boxSources/DateCalculateBoxSource';
import JsonToolsBoxSource from '@modules/boxSources/JsonToolsBoxSource';
import MathExpressionBoxSource from '@modules/boxSources/MathExpressionBoxSource';
import NowBoxSource from '@modules/boxSources/NowBoxSource';
import Pbkdf2BoxSource from '@modules/boxSources/Pbkdf2BoxSource';
import SortLinesBoxSource from '@modules/boxSources/SortLinesBoxSource';
import TimestampBoxSource from '@modules/boxSources/TimestampBoxSource';
import UnitConverterBoxSource from '@modules/boxSources/UnitConverterBoxSource';
import WeekNumberBoxSource from '@modules/boxSources/WeekNumberBoxSource';
import type { ComputeWorkerSource, ResolveComputeWorkerSource } from './entry';

type WorkerSourceLoader = () => Promise<ComputeWorkerSource>;

/** Keeps the worker graph limited to the source implementations that can run there. */
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

const workerLoaders = new Map<string, WorkerSourceLoader>([
  ['base64-decode', async () => Base64DecodeBoxSource],
  ['cron-expression', async () => CronExpressionBoxSource],
  ['data-converter', async () => DataConverterBoxSource],
  ['json-tools', async () => JsonToolsBoxSource],
  ['date-calculate', async () => DateCalculateBoxSource],
  ['math-expression', async () => MathExpressionBoxSource],
  ['now', async () => NowBoxSource],
  ['timestamp', async () => TimestampBoxSource],
  ['base64-encode', async () => Base64EncodeBoxSource],
  ['sort-lines', async () => SortLinesBoxSource],
  ['unit-converter', async () => UnitConverterBoxSource],
  ['week-number', async () => WeekNumberBoxSource],
  ['pbkdf2', async () => Pbkdf2BoxSource],
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
