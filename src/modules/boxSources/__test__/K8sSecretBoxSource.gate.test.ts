import { expect, vi } from 'vitest';

describe('K8sSecretBoxSource lexical gate', () => {
  it('does not load yaml for unrelated input', async () => {
    let yamlLoaded = false;
    vi.doMock('yaml', () => {
      yamlLoaded = true;
      return {};
    });

    try {
      const { K8sSecretBoxSource } = await import('../K8sSecretBoxSource');
      await expect(
        K8sSecretBoxSource.generateBoxes('a long unrelated log line'),
      ).resolves.toEqual([]);
      expect(yamlLoaded).toBe(false);
    } finally {
      vi.doUnmock('yaml');
      vi.resetModules();
    }
  });
});
