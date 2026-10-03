import { MODEL, MODEL_CACHE } from './modelCatalog';

// The files loaded by the pinned Qwen2.5 q4f16 model and tokenizer, including
// the generation config. Review this manifest alongside MODEL.downloadBytes
// whenever the model revision, architecture or runtime changes.
export const MODEL_CACHE_FILES = [
  'config.json',
  'generation_config.json',
  'tokenizer.json',
  'tokenizer_config.json',
  `onnx/model_${MODEL.dtype}.onnx`,
] as const;

// Do not use ModelRegistry here. In 4.3.0 its file-discovery helpers discard
// local_files_only and may probe Hub metadata; the remaining local-only config
// load also conflicts with env.allowLocalModels=false. CacheStorage.match is
// strictly local and does not read the cached ONNX response body into memory.
export async function isModelCached(
  storage: Pick<CacheStorage, 'match'> | undefined = globalThis.caches,
): Promise<boolean> {
  if (!storage) return false;
  const base = `https://huggingface.co/${MODEL.id}/resolve/${MODEL.revision}/`;
  for (const file of MODEL_CACHE_FILES) {
    const response = await storage.match(`${base}${file}`, {
      cacheName: MODEL_CACHE,
    });
    if (!response) return false;
  }
  return true;
}
