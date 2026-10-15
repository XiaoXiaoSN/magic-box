import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Parse the static registry with the pinned TypeScript 5.x API. The generator
// never imports a source implementation, so documentation stays offline and
// cannot initialize browser, WASM, worker, AI, or network code.
import ts from 'typescript-docs';

const root = fileURLToPath(new URL('../', import.meta.url));
const registryPath = path.join(root, 'src/modules/boxSources/index.ts');

function propertyName(property) {
  return property.name?.text ?? property.name?.getText();
}

function declarations(file) {
  return new Map(
    file.statements.flatMap((statement) => {
      if (!ts.isVariableStatement(statement)) return [];
      return statement.declarationList.declarations.map((declaration) => [
        declaration.name.getText(file),
        declaration.initializer,
      ]);
    }),
  );
}

function evaluateStatic(node, bindings, seen = new Set()) {
  if (!node) throw new Error('Missing static registry expression');
  if (ts.isStringLiteralLike(node)) return node.text;
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (
    ts.isAsExpression(node) ||
    ts.isParenthesizedExpression(node) ||
    ts.isSatisfiesExpression(node)
  ) {
    return evaluateStatic(node.expression, bindings, seen);
  }
  if (ts.isIdentifier(node)) {
    if (seen.has(node.text))
      throw new Error(`Cyclic registry expression: ${node.text}`);
    const expression = bindings.get(node.text);
    if (!expression)
      throw new Error(`Unsupported registry identifier: ${node.text}`);
    return evaluateStatic(expression, bindings, new Set(seen).add(node.text));
  }
  if (ts.isSpreadElement(node))
    return evaluateStatic(node.expression, bindings, seen);
  if (ts.isArrayLiteralExpression(node))
    return node.elements.flatMap((element) =>
      evaluateStatic(element, bindings, seen),
    );
  if (ts.isObjectLiteralExpression(node)) {
    const metadataFields = new Set([
      'id',
      'name',
      'description',
      'defaultInput',
      'kind',
      'defaultDisabled',
      'optionKeys',
      'load',
    ]);
    return Object.fromEntries(
      node.properties.map((property) => {
        if (!ts.isPropertyAssignment(property))
          throw new Error(
            `Unsupported registry property: ${property.getText()}`,
          );
        const name = propertyName(property);
        if (!name)
          throw new Error(
            `Missing registry property name: ${property.getText()}`,
          );
        if (!metadataFields.has(name)) return [name, undefined];
        if (name === 'load') return [name, property.initializer.getText()];
        return [name, evaluateStatic(property.initializer, bindings, seen)];
      }),
    );
  }
  throw new Error(`Unsupported registry expression: ${node.getText()}`);
}

function loadModulePath(source) {
  const match = source.load?.match(/import\(\s*['"](\.\/[^'"]+)['"]\s*\)/);
  if (!match)
    throw new Error(`Missing source loader for ${source.id ?? '<unknown>'}`);
  return `src/modules/boxSources/${match[1].slice(2)}.ts`;
}

function validateSource(source, index) {
  const required = [
    'id',
    'name',
    'description',
    'defaultInput',
    'kind',
    'optionKeys',
  ];
  for (const field of required) {
    if (!(field in source))
      throw new Error(`Source ${index + 1} is missing ${field}`);
  }
  if (
    typeof source.id !== 'string' ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(source.id)
  )
    throw new Error(`Invalid source id at position ${index + 1}: ${source.id}`);
  if (typeof source.name !== 'string' || typeof source.description !== 'string')
    throw new Error(`Invalid source labels for ${source.id}`);
  if (
    typeof source.defaultInput !== 'string' ||
    typeof source.kind !== 'string'
  )
    throw new Error(`Invalid source defaults for ${source.id}`);
  if (
    !Array.isArray(source.optionKeys) ||
    source.optionKeys.some((key) => typeof key !== 'string')
  )
    throw new Error(`Invalid option keys for ${source.id}`);
  return {
    id: source.id,
    name: source.name,
    description: source.description,
    defaultInput: source.defaultInput,
    kind: source.kind,
    defaultDisabled: source.defaultDisabled === true,
    optionKeys: source.optionKeys,
    file: loadModulePath(source),
  };
}

export function parseSourceManifest(text, filename = registryPath) {
  const file = ts.createSourceFile(
    filename,
    text,
    ts.ScriptTarget.Latest,
    true,
  );
  const bindings = declarations(file);
  const manifest = bindings.get('sourceManifest');
  if (!manifest) throw new Error('Cannot find sourceManifest declaration');
  const sources = evaluateStatic(manifest, bindings).map(validateSource);
  const ids = new Set(sources.map((source) => source.id));
  if (ids.size !== sources.length) throw new Error('Duplicate source ids');
  return sources;
}

export function readSourceManifest() {
  return parseSourceManifest(readFileSync(registryPath, 'utf8'));
}

function html(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('|', '&#124;')
    .replaceAll('`', '&#96;');
}

function code(value) {
  return `<code>${html(value).replaceAll('\n', '<br>')}</code>`;
}

export function renderDocumentation(sources) {
  const table = [
    '# Tool reference',
    '',
    'Browse the [interactive tool list](https://mb.10oz.tw/list), or return to the [README](../README.md) for usage examples.',
    '',
    '<!-- Generated by scripts/generate-tool-docs.mjs; do not edit by hand. -->',
    '',
    `All ${sources.length} registered tools, in the same order as the runtime registry. Each line break in an example is significant; put each \`::option\` on its own line. Enable tools marked **off** in Settings before using them on the web.`,
    '',
    'Option keys include aliases and routing controls; a dash means the source matches input without a tool-specific option. See the README and focused guides for usage details.',
    '',
    '| ID | Tool | Kind | Default | Description | Example input | Option keys |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...sources.map(
      (source) =>
        `| \`${source.id}\` | [${html(source.name)}](../${source.file}) | ${html(source.kind)} | ${source.defaultDisabled ? '**off**' : 'on'} | ${html(source.description)} | ${code(source.defaultInput)} | ${source.optionKeys.map((key) => code(`::${key}`)).join(', ') || '—'} |`,
    ),
  ].join('\n');

  const llms = [
    '# Magic Box',
    '',
    '> Browser and terminal tools for converting, decoding, generating and inspecting text.',
    '',
    '- [Interactive tool list](https://mb.10oz.tw/list)',
    '- [Usage and examples](https://github.com/XiaoXiaoSN/magic-box/blob/main/README.md)',
    '- [Complete tool reference](https://github.com/XiaoXiaoSN/magic-box/blob/main/docs/tools.md)',
    '- [Developer guide](https://github.com/XiaoXiaoSN/magic-box/blob/main/DEVELOPER.md)',
    '- [Terminal UI](https://github.com/XiaoXiaoSN/magic-box/blob/main/docs/terminal-ui.md)',
    '',
    '## Tools',
    '',
    ...sources.flatMap((source) => [
      `### ${source.name} (${source.id})`,
      '',
      source.description,
      '',
      `Category: ${source.kind}. Enabled by default on the web: ${!source.defaultDisabled}.`,
      `Option keys: ${source.optionKeys.map((key) => `::${key}`).join(', ') || 'none'}.`,
      '',
      'Example (each ::option starts a new line):',
      '~~~~text',
      source.defaultInput,
      '~~~~',
      '',
    ]),
  ].join('\n');

  return { tools: `${table}\n`, llms };
}

function main() {
  const sources = readSourceManifest();
  const { tools, llms } = renderDocumentation(sources);
  let stale = false;
  for (const [filename, content] of [
    ['docs/tools.md', tools],
    ['public/llms.txt', llms],
  ]) {
    const outputPath = path.join(root, filename);
    if (process.argv.includes('--check')) {
      let current = null;
      try {
        current = readFileSync(outputPath, 'utf8');
      } catch {
        // missing output is drift
      }
      if (current !== content) {
        console.error(`${filename} is stale; run bun run docs:generate`);
        stale = true;
      }
    } else writeFileSync(outputPath, content);
  }
  if (stale) process.exitCode = 1;
  else
    console.log(
      `${process.argv.includes('--check') ? 'Checked' : 'Generated'} documentation for ${sources.length} tools.`,
    );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main();
