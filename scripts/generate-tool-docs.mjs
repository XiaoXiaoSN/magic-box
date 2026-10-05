// Read the registry as TypeScript syntax: documentation generation must not
// initialize browser components, WASM, workers, or network-backed sources.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// TypeScript 7's default entry has no parser API. Keep the stable 5.x parser
// isolated from the application's TypeScript compiler.
import ts from 'typescript-docs';

const root = fileURLToPath(new URL('../', import.meta.url));
const modules = new Map();
const helpers = new Set(['hasOptionKeys', 'extractOptionKeys']);

function readModule(filename) {
  if (modules.has(filename)) return modules.get(filename);
  const file = ts.createSourceFile(
    filename,
    readFileSync(filename, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );
  modules.set(filename, file);
  return file;
}

function importedFile(node) {
  const specifier = node.moduleSpecifier.text;
  const filename = specifier.startsWith('@')
    ? path.join(root, 'src', specifier.slice(1))
    : path.resolve(path.dirname(node.getSourceFile().fileName), specifier);
  return readModule(`${filename}.ts`);
}

function declaration(file, name) {
  for (const statement of file.statements) {
    if (ts.isVariableStatement(statement)) {
      const item = statement.declarationList.declarations.find(
        (d) => d.name.getText(file) === name,
      );
      if (item) return item.initializer;
    }
    if (ts.isImportDeclaration(statement) && statement.importClause) {
      const clause = statement.importClause;
      if (clause.name?.text === name) {
        const imported = importedFile(statement);
        return imported.statements.find(ts.isExportAssignment)?.expression;
      }
      const binding = clause.namedBindings;
      if (binding && ts.isNamedImports(binding)) {
        const item = binding.elements.find((e) => e.name.text === name);
        if (item)
          return declaration(
            importedFile(statement),
            item.propertyName?.text ?? name,
          );
      }
    }
  }
  throw new Error(`Cannot resolve ${name} in ${file.fileName}`);
}

// Resolve only the data expressions used by source metadata and option keys.
// Unsupported syntax fails generation instead of silently omitting a tool/key.
function values(node, seen = new Set()) {
  if (!node || seen.has(node))
    throw new Error(`Unresolved/cyclic expression: ${node?.getText()}`);
  const next = new Set(seen).add(node);
  const resolve = (child) => values(child, next);
  if (ts.isStringLiteralLike(node)) return [node.text];
  if (node.kind === ts.SyntaxKind.TrueKeyword) return [true];
  if (node.kind === ts.SyntaxKind.FalseKeyword) return [false];
  if (
    ts.isAsExpression(node) ||
    ts.isParenthesizedExpression(node) ||
    ts.isSatisfiesExpression(node)
  )
    return resolve(node.expression);
  if (ts.isArrayLiteralExpression(node)) return node.elements.flatMap(resolve);
  if (ts.isSpreadElement(node)) return resolve(node.expression);
  if (ts.isObjectLiteralExpression(node)) return [node];
  if (
    ts.isBinaryExpression(node) &&
    node.operatorToken.kind === ts.SyntaxKind.PlusToken
  ) {
    const left = resolve(node.left),
      right = resolve(node.right);
    if (left.length === 1 && right.length === 1) return [left[0] + right[0]];
  }
  if (ts.isConditionalExpression(node))
    return [...resolve(node.whenTrue), ...resolve(node.whenFalse)];
  if (ts.isTemplateExpression(node)) {
    return [
      node.head.text +
        node.templateSpans
          .map((span) => {
            const value = resolve(span.expression);
            if (value.length !== 1) throw new Error('Ambiguous template');
            return value[0] + span.literal.text;
          })
          .join(''),
    ];
  }
  if (ts.isIdentifier(node)) {
    // Callback parameters and for-of bindings represent every member of the
    // data array, not just the first algorithm/format.
    for (let parent = node.parent; parent; parent = parent.parent) {
      if (
        ts.isArrowFunction(parent) &&
        parent.parameters.some((p) => p.name.getText() === node.text)
      ) {
        const call = parent.parent;
        if (
          ts.isCallExpression(call) &&
          ts.isPropertyAccessExpression(call.expression)
        )
          return resolve(call.expression.expression);
      }
      if (
        ts.isForOfStatement(parent) &&
        parent.initializer.getText().replace(/^(const|let)\s+/, '') ===
          node.text
      )
        return resolve(parent.expression);
      if (ts.isBlock(parent)) {
        for (const statement of parent.statements) {
          if (!ts.isVariableStatement(statement)) continue;
          const binding = statement.declarationList.declarations.find(
            (d) => d.name.getText() === node.text,
          );
          if (binding) return resolve(binding.initializer);
        }
      }
    }
    return resolve(declaration(node.getSourceFile(), node.text));
  }
  if (ts.isPropertyAccessExpression(node)) {
    return resolve(node.expression).flatMap((object) => {
      const field = object.properties?.find(
        (p) => p.name?.getText().replace(/['"]/g, '') === node.name.text,
      );
      if (!field || !ts.isPropertyAssignment(field))
        throw new Error(`Cannot resolve ${node.getText()}`);
      return resolve(field.initializer);
    });
  }
  if (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression)
  ) {
    const method = node.expression.name.text;
    if (node.expression.getText() === 'Object.values') {
      return resolve(node.arguments[0]).flatMap((object) =>
        object.properties.flatMap((p) => resolve(p.initializer)),
      );
    }
    if (method === 'flat') return resolve(node.expression.expression);
    if (method === 'flatMap' || method === 'map') {
      const callback = node.arguments[0];
      if (ts.isArrowFunction(callback)) return resolve(callback.body);
    }
  }
  throw new Error(
    `Unsupported documentation expression in ${node.getSourceFile().fileName}: ${node.getText()}`,
  );
}

function property(object, name, fallback) {
  const field = object.properties.find((p) => p.name?.getText() === name);
  if (!field) {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing source metadata: ${name}`);
  }
  const result = values(field.initializer);
  if (result.length !== 1)
    throw new Error(`Ambiguous source metadata: ${name}`);
  return result[0];
}

export function optionKeys(file) {
  const keys = new Set();
  const add = (node) => {
    for (const key of values(node)) {
      if (typeof key !== 'string')
        throw new Error(`Non-string option key in ${file.fileName}`);
      keys.add(key);
    }
  };
  const visit = (node) => {
    if (ts.isCallExpression(node) && helpers.has(node.expression.getText()))
      node.arguments.slice(1).forEach(add);
    if (
      ts.isPropertyAccessExpression(node) &&
      node.expression.getText() === 'options'
    )
      keys.add(node.name.text);
    if (
      ts.isElementAccessExpression(node) &&
      node.expression.getText() === 'options'
    )
      add(node.argumentExpression);
    ts.forEachChild(node, visit);
  };
  visit(file);
  return [...keys].sort();
}

function main() {
  const registry = readModule(
    path.join(root, 'src/modules/boxSources/index.ts'),
  );
  const sources = values(declaration(registry, 'boxSources')).map((source) => ({
    name: property(source, 'name'),
    description: property(source, 'description'),
    defaultInput: property(source, 'defaultInput'),
    kind: property(source, 'kind'),
    defaultDisabled: property(source, 'defaultDisabled', false),
    optionKeys: [
      ...new Set([
        ...optionKeys(source.getSourceFile()),
        ...source.properties
          .filter((p) => p.name?.getText() === 'optionKeys')
          .flatMap((p) => values(p.initializer)),
      ]),
    ].sort(),
    file: path
      .relative(root, source.getSourceFile().fileName)
      .split(path.sep)
      .join('/'),
  }));
  if (new Set(sources.map((s) => s.name)).size !== sources.length)
    throw new Error('Duplicate source names');

  const html = (value) =>
    String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('|', '&#124;')
      .replaceAll('`', '&#96;');
  const code = (value) =>
    `<code>${html(value).replaceAll('\n', '<br>')}</code>`;
  const table = [
    `All ${sources.length} registered tools. Each line break in an example is significant; put each \`::option\` on its own line. Enable tools marked **off** in Settings before using them on the web.`,
    '',
    'Option keys include aliases and routing controls; a dash means the source matches input without a tool-specific option. See the description and detailed guides for accepted values.',
    '',
    '| Tool | Kind | Default | Description | Example input | Option keys |',
    '| --- | --- | --- | --- | --- | --- |',
    ...sources.map(
      (s) =>
        `| [${html(s.name)}](${s.file}) | ${html(s.kind)} | ${s.defaultDisabled ? '**off**' : 'on'} | ${html(s.description)} | ${code(s.defaultInput)} | ${s.optionKeys.map((key) => code(`::${key}`)).join(', ') || '—'} |`,
    ),
  ].join('\n');

  const start = '<!-- BEGIN GENERATED TOOL CATALOG -->';
  const end = '<!-- END GENERATED TOOL CATALOG -->';
  const readme = readFileSync(path.join(root, 'README.md'), 'utf8');
  if (readme.split(start).length !== 2 || readme.split(end).length !== 2)
    throw new Error('README needs exactly one tool catalog marker pair');
  const updated = `${readme.slice(0, readme.indexOf(start) + start.length)}\n\n${table}\n\n${readme.slice(readme.indexOf(end))}`;
  const llms = [
    '# Magic Box',
    '',
    '> Browser and terminal tools for converting, decoding, generating and inspecting text.',
    '',
    '- [Interactive tool list](https://mb.10oz.tw/list)',
    '- [Usage and development](https://github.com/XiaoXiaoSN/magic-box/blob/main/README.md)',
    '- [Terminal UI](https://github.com/XiaoXiaoSN/magic-box/blob/main/docs/terminal-ui.md)',
    '',
    '## Tools',
    '',
    ...sources.flatMap((s) => [
      `### ${s.name}`,
      '',
      s.description,
      '',
      `Category: ${s.kind}. Enabled by default on the web: ${!s.defaultDisabled}.`,
      `Option keys: ${s.optionKeys.map((key) => `::${key}`).join(', ') || 'none'}.`,
      '',
      'Example (each ::option starts a new line):',
      '~~~~text',
      s.defaultInput,
      '~~~~',
      '',
    ]),
  ].join('\n');

  let stale = false;
  for (const [filename, content] of [
    ['README.md', updated],
    ['public/llms.txt', llms],
  ]) {
    if (process.argv.includes('--check')) {
      let current;
      try {
        current = readFileSync(path.join(root, filename), 'utf8');
      } catch {
        /* missing output is drift */
      }
      if (current !== content) {
        console.error(`${filename} is stale; run bun run docs:generate`);
        stale = true;
      }
    } else writeFileSync(path.join(root, filename), content);
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
