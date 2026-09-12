// Run the worker protocol tests without a GPU, network or browser.
const { existsSync, mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const output = mkdtempSync(path.join(tmpdir(), 'magic-box-local-ai-'));
const localTsc = path.join(root, 'node_modules', 'typescript', 'bin', 'tsc');
const modules = [
  'types', 'modelCatalog', 'tasks', 'capabilities', 'runtime',
  'engine', 'client', 'privacy', 'messages',
];

const run = (command, args, env = process.env) => {
  const result = spawnSync(command, args, { cwd: root, env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} exited with ${result.status}`);
};

try {
  const args = [
    '--target', 'es2022', '--module', 'commonjs', '--moduleResolution', 'node',
    '--strict', '--skipLibCheck', '--lib', 'es2022,dom', '--outDir', output,
    ...modules.map((name) => `src/features/local-ai/${name}.ts`),
  ];
  if (existsSync(localTsc)) run(process.execPath, [localTsc, ...args]);
  else run('tsc', args);
  run(process.execPath, ['--test', 'scripts/local-ai-core.test.cjs'], {
    ...process.env, MAGIC_BOX_AI_TEST_DIR: output,
  });
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  // Only remove the unique temporary directory created by this script.
  rmSync(output, { recursive: true, force: true });
}
