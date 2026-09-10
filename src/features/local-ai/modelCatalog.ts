// Browser-only runtime: exact release, never a floating CDN alias.
// The standalone distribution avoids pulling native ONNX/sharp into the TUI.
export const RUNTIME_VERSION = '4.2.0';
export const RUNTIME_URL =
  'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0/dist/transformers.min.js';
export const MODEL = {
  id: 'onnx-community/Qwen2.5-0.5B-Instruct',
  name: 'Qwen2.5 0.5B Instruct',
  revision: 'cc5cc01a65cc3ff17bdb73a7de33d879f62599b0',
  dtype: 'q4f16',
  device: 'webgpu',
  license: 'Apache-2.0',
} as const;

// Model weights AND ORT WASM/factory files use this dedicated cache. Never
// delete Workbox's app caches or another feature's downloads when clearing it.
export const MODEL_CACHE = `magic-box-local-ai-${RUNTIME_VERSION}-${MODEL.revision}-${MODEL.dtype}`;
export const RUNTIME_CACHE = 'magic-box-local-ai-runtime-v1';
export const MAX_INPUT_CHARS = 6000;
export const MAX_PROMPT_TOKENS = 1024;
export const MAX_NEW_TOKENS = 256;
export const MODEL_OPTIONS = {
  revision: MODEL.revision,
  dtype: MODEL.dtype,
  device: MODEL.device,
};
