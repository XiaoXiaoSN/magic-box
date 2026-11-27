import { statSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';

const [, , filePath, outputPath] = process.argv;
const files = new Map();
const importDirectories = new Map();

const remember = (paths, path) => {
  const info = statSync(path, { bigint: true, throwIfNoEntry: false });
  paths.set(
    path,
    info ? `${info.ino}:${info.size}:${info.mtimeNs}:${info.ctimeNs}` : null,
  );
};

const result = await Bun.build({
  entrypoints: [filePath],
  target: 'browser',
  format: 'cjs',
  naming: basename(outputPath),
  sourcemap: 'inline',
  throw: false,
  plugins: [
    {
      name: 'cypress-watch-dependencies',
      setup(build) {
        build.onLoad({ filter: /.*/, namespace: 'file' }, ({ path }) => {
          // Observe the input before Bun reads it. Node rechecks this timestamp
          // when the watch is installed so a save during bundling is retained.
          remember(files, path);
        });
        build.onResolve(
          { filter: /^(?:\.{1,2}[/\\]|\/)/ },
          ({ path, importer }) => {
            const requested = resolve(dirname(importer), path);
            // On failure, watch for creation of an extensionless import or its index.
            remember(importDirectories, dirname(requested));
            if (statSync(requested, { throwIfNoEntry: false })?.isDirectory()) {
              remember(importDirectories, requested);
            }
          },
        );
      },
    },
  ],
});

if (result.success) {
  await Bun.write(
    outputPath,
    result.outputs.find(({ kind }) => kind === 'entry-point'),
  );
  console.log(JSON.stringify({ files: [...files] }));
} else {
  console.log(
    JSON.stringify({
      files: [...files],
      importDirectories: [...importDirectories],
      error: result.logs.map(String).join('\n'),
    }),
  );
}
