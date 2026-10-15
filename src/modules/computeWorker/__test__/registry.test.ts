import { describe, expect, it } from 'vitest';

import {
  registerComputeWorkerSource,
  resolveComputeWorkerSource,
} from '../registry';

describe('compute worker source registry', () => {
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
