import { LocalAIError } from './types';

// Only the WebGPU surface used by the capability check; this keeps the
// headless code independent of ambient @webgpu/types and browser globals.
export interface GPUAccess {
  requestAdapter(): Promise<{ features: { has(name: string): boolean } } | null>;
}

export async function checkCapabilities(
  secure: boolean,
  gpu: GPUAccess | undefined,
): Promise<void> {
  if (!secure || !gpu) throw new LocalAIError('unsupported');
  const adapter = await gpu.requestAdapter().catch(() => {
    throw new LocalAIError('unsupported');
  });
  if (!adapter?.features.has('shader-f16')) {
    // Never silently switch to a larger q4 download or CPU inference.
    throw new LocalAIError('unsupported');
  }
}
