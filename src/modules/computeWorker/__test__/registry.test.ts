import { sourceManifest } from '@modules/boxSources';
import { describe, expect, it } from 'vitest';

import {
  registerComputeWorkerSource,
  resolveComputeWorkerSource,
  workerSourceIds,
} from '../registry';

describe('compute worker source registry', () => {
  it('keeps the narrow worker loader map aligned with the manifest', () => {
    expect([...workerSourceIds].sort()).toEqual(
      sourceManifest
        .filter((definition) => definition.workerSafe === true)
        .map((definition) => definition.id)
        .sort(),
    );
  });

  it('lazily resolves only explicitly worker-safe sources', async () => {
    const dataConverter = await resolveComputeWorkerSource('data-converter');
    expect(dataConverter).not.toBeNull();
    expect(await resolveComputeWorkerSource('my-ip')).toBeNull();
    expect(await resolveComputeWorkerSource('missing')).toBeNull();
  });

  it('retains explicitly registered test sources', async () => {
    const source = {
      async generateBoxes() {
        return [];
      },
    };
    registerComputeWorkerSource('test-source', source);
    await expect(resolveComputeWorkerSource('test-source')).resolves.toBe(
      source,
    );
  });
});
