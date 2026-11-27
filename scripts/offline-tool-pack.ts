import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';

interface ManifestEntry {
  file: string;
  imports?: string[];
  dynamicImports?: string[];
  css?: string[];
  assets?: string[];
}

const roots = [
  'src/modules/boxSources/DataConverterBoxSource.ts',
  'src/modules/boxSources/HashBoxSource.ts',
  'src/modules/boxSources/MathExpressionBoxSource.ts',
  'src/components/BoxTemplate/CodeBoxTemplate.tsx',
];

export function writeOfflineToolPack(outputDir: string, version: string): void {
  const index = path.join(outputDir, 'build-manifest.json');
  if (!existsSync(index)) return;
  const manifest = JSON.parse(readFileSync(index, 'utf8')) as Record<
    string,
    ManifestEntry
  >;
  const files = readdirSync(path.join(outputDir, 'assets')).filter((file) =>
    /-[A-Za-z0-9_-]{8}\.(?:css|js|wasm)$/.test(file),
  );
  const worker = files.find((file) => /^compute\.worker-/.test(file));
  if (!worker || roots.some((root) => !manifest[root])) return;

  const selected = new Set<string>();
  const visited = new Map<string, boolean>();
  const visit = (key: string, dynamic: boolean): void => {
    const alreadyVisited = visited.get(key);
    if (alreadyVisited === true || alreadyVisited === dynamic) return;
    visited.set(key, dynamic);
    const entry = manifest[key];
    if (!entry) throw new Error(`Missing offline tool asset entry ${key}`);
    selected.add(entry.file);
    for (const asset of [...(entry.css ?? []), ...(entry.assets ?? [])])
      selected.add(asset);
    for (const dependency of entry.imports ?? []) visit(dependency, false);
    if (dynamic)
      for (const dependency of entry.dynamicImports ?? [])
        visit(dependency, true);
  };
  for (const root of roots) visit(root, true);

  // Vite builds the worker in its own graph. Follow emitted chunk and WASM
  // URLs there because they are outside the page's manifest.
  const workerAssets = new Set<string>();
  const visitWorkerAsset = (file: string): void => {
    if (workerAssets.has(file)) return;
    workerAssets.add(file);
    selected.add(`assets/${file}`);
    if (!file.endsWith('.js')) return;
    const content = readFileSync(path.join(outputDir, 'assets', file), 'utf8');
    for (const other of files) {
      if (content.includes(other)) visitWorkerAsset(other);
    }
  };
  visitWorkerAsset(worker);

  const assets = [...selected].sort().map((file) => ({
    url: `/${file}`,
    bytes: statSync(path.join(outputDir, file)).size,
  }));
  writeFileSync(
    path.join(outputDir, 'offline-tool-pack.json'),
    `${JSON.stringify({ version, assets })}\n`,
  );
}
