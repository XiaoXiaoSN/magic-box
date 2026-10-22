type MathBoxModule = typeof import('math-box');

interface RuntimeAssets {
  mathWasm?: () => Promise<Uint8Array>;
  base64Wasm?: () => Promise<Uint8Array>;
  freshMathBox?: () => MathBoxModule;
}

const runtimeAssetsKey = Symbol.for('magic-box.runtime-assets');

function getRuntimeAssets(): RuntimeAssets {
  const registry = globalThis as typeof globalThis & {
    [runtimeAssetsKey]?: RuntimeAssets;
  };
  let assets = registry[runtimeAssetsKey];
  if (!assets) {
    assets = {};
    registry[runtimeAssetsKey] = assets;
  }
  return assets;
}

export function installRuntimeAssets(assets: RuntimeAssets): void {
  Object.assign(getRuntimeAssets(), assets);
}

export function loadRuntimeWasm(
  name: 'math' | 'base64',
): Promise<Uint8Array> | undefined {
  const assets = getRuntimeAssets();
  return name === 'math' ? assets.mathWasm?.() : assets.base64Wasm?.();
}

export function createFreshMathBox(): MathBoxModule | undefined {
  return getRuntimeAssets().freshMathBox?.();
}
