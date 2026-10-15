import { sourceManifest } from '@modules/boxSources';
import {
  createLazyBoxSource,
  type LazyBoxSourceDefinition,
} from '@modules/boxSources/lazySource';

import type { ComputeWorkerSource, ResolveComputeWorkerSource } from './entry';

type WorkerSourceLoader = () => Promise<ComputeWorkerSource>;

const workerLoaders = new Map<string, WorkerSourceLoader>(
  sourceManifest
    .filter((definition) => definition.workerSafe === true)
    .map((definition) => [definition.id, () => loadWorkerSource(definition)]),
);
const workerSources = new Map<string, Promise<ComputeWorkerSource>>();

async function loadWorkerSource(
  definition: LazyBoxSourceDefinition,
): Promise<ComputeWorkerSource> {
  const source = createLazyBoxSource(definition);
  await source.load();
  return source;
}

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
