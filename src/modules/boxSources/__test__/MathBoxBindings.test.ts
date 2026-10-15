import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

import { Compiled, default as init } from 'math-box';
import { beforeAll, expect, it } from 'vitest';

const require = createRequire(import.meta.url);

beforeAll(async () => {
  await init({
    module_or_path: await readFile(
      require.resolve('math-box/math_box_bg.wasm'),
    ),
  });
});

it('uses the generated Compiled lifecycle and exposes one free method', async () => {
  const declaration = await readFile(
    require.resolve('math-box/math_box.d.ts'),
    'utf8',
  );
  const compiledDeclaration = declaration.match(
    /export class Compiled \{([\s\S]*?)\n\}/,
  )?.[1];

  expect(compiledDeclaration).toBeDefined();
  expect(compiledDeclaration?.match(/^ {4}free\(\): void;$/gm)).toHaveLength(1);

  const compiled = new Compiled('x = 1; x + 1');
  try {
    expect(compiled.evaluate()).toBe('2');
    const typed = compiled.evaluate_typed();
    try {
      expect(typed.text).toBe('2');
    } finally {
      typed.free();
    }
    expect(compiled[Symbol.dispose]).toBe(compiled.free);
  } finally {
    compiled.free();
  }
});
