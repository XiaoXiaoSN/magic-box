import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const projectRoot = resolve(import.meta.dir, '..');
const outputDirectory = resolve(projectRoot, 'dist-tui');

await mkdir(outputDirectory, { recursive: true });
process.chdir(projectRoot);

const tuiAssetPlugin = {
  name: 'magic-box-tui-asset-urls',
  setup(build: Bun.PluginBuilder) {
    build.onLoad(
      { filter: /ink\/build\/(reconciler|ink)\.js$/ },
      async ({ path }) => {
        const source = await readFile(path, 'utf8');
        const contents = source
          .replaceAll("process.env['DEV'] === 'true'", 'false')
          .replace(
            "await import('./devtools.js');",
            'await Promise.resolve();',
          );
        if (
          path.endsWith('/reconciler.js') &&
          contents.includes("import('./devtools.js')")
        ) {
          throw new Error('Update the Ink devtools adapter for this release');
        }
        return { contents, loader: 'js' };
      },
    );
    build.onResolve({ filter: /^magic-box:math-box-glue-factory$/ }, () => ({
      path: 'math-box-glue-factory',
      namespace: 'magic-box-tui-generated',
    }));
    build.onLoad(
      {
        filter: /^math-box-glue-factory$/,
        namespace: 'magic-box-tui-generated',
      },
      async () => {
        const source = await readFile(
          resolve(projectRoot, 'node_modules/math-box/math_box.js'),
          'utf8',
        );
        const declarations = [
          ...source.matchAll(
            /^export (?:function|class|const|let|var)\s+(\w+)/gm,
          ),
        ].map((match) => match[1]);
        const exportBlocks = [...source.matchAll(/^export\s*\{([^}]+)\};?$/gm)];
        const returnValues = declarations.map((name) => `${name}: ${name}`);
        for (const block of exportBlocks) {
          for (const entry of block[1].split(',')) {
            const [localName, exportedName = localName] = entry
              .trim()
              .split(/\s+as\s+/);
            returnValues.push(
              exportedName === 'default'
                ? `default: ${localName}`
                : exportedName === localName
                  ? localName
                  : `${exportedName}: ${localName}`,
            );
          }
        }
        const contents = source
          .replace(/^export (function|class|const|let|var)\s/gm, '$1 ')
          .replace(/^export\s*\{[^}]+\};?$/gm, '');
        return {
          contents: `export function createFreshMathBoxModule() {${contents}\nreturn { ${returnValues.join(', ')} };}`,
          loader: 'js',
        };
      },
    );
    build.onResolve({ filter: /^math-box\/.*\?url$/ }, ({ path }) => ({
      path,
      namespace: 'magic-box-tui-asset-urls',
    }));
    build.onLoad(
      { filter: /.*/, namespace: 'magic-box-tui-asset-urls' },
      ({ path }) => ({
        contents: `export default ${JSON.stringify(path.slice(0, -4))};`,
        loader: 'js',
      }),
    );
  },
};

const build = await Bun.build({
  entrypoints: [resolve(projectRoot, 'src/tui/compiledEntry.ts')],
  root: projectRoot,
  target: 'bun',
  plugins: [tuiAssetPlugin],
  compile: {
    outfile: resolve(outputDirectory, 'magic-box-tui'),
    assets: [
      resolve(projectRoot, 'node_modules/math-box'),
      resolve(projectRoot, 'node_modules/base64-box'),
    ],
    autoloadDotenv: false,
    autoloadBunfig: false,
    autoloadTsconfig: true,
  },
});

if (!build.success) {
  for (const log of build.logs) console.error(log);
  process.exitCode = 1;
} else {
  console.log(`Built ${resolve(outputDirectory, 'magic-box-tui')}`);
}
