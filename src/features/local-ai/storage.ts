export interface LocalAIStorageStatus {
  quotaBytes: number | null;
  usageBytes: number | null;
  persisted: boolean | null;
}

export async function readLocalAIStorageStatus(): Promise<LocalAIStorageStatus> {
  const storage =
    typeof navigator === 'undefined' ? undefined : navigator.storage;
  if (!storage) {
    return { quotaBytes: null, usageBytes: null, persisted: null };
  }
  const [estimate, persisted] = await Promise.all([
    storage.estimate?.().catch(() => undefined),
    storage.persisted?.().catch(() => undefined),
  ]);
  return {
    quotaBytes: typeof estimate?.quota === 'number' ? estimate.quota : null,
    usageBytes: typeof estimate?.usage === 'number' ? estimate.usage : null,
    persisted: typeof persisted === 'boolean' ? persisted : null,
  };
}
