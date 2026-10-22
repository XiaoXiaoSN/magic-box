import { createFreshMathBoxModule } from 'magic-box:math-box-glue-factory';
import { installRuntimeAssets } from '@modules/boxSources/runtimeAssets';
import base64BoxWasmUrl from 'base64-box/base64_box_bg.wasm' with {
  type: 'file',
};
import mathBoxWasmUrl from 'math-box/math_box_bg.wasm' with { type: 'file' };

declare const Bun: { embeddedFiles: Array<Blob & { name: string }> };

function embeddedFile(url: string): Blob {
  const name = url.slice(url.lastIndexOf('/') + 1);
  const file = Bun.embeddedFiles.find((asset) => asset.name === name);
  if (!file) throw new Error(`Missing embedded asset: ${name}`);
  return file;
}

installRuntimeAssets({
  mathWasm: async () =>
    new Uint8Array(await embeddedFile(mathBoxWasmUrl).arrayBuffer()),
  base64Wasm: async () =>
    new Uint8Array(await embeddedFile(base64BoxWasmUrl).arrayBuffer()),
  freshMathBox: createFreshMathBoxModule,
});
