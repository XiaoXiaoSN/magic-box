import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';

// Run the same deterministic protocol suite locally and in existing Vitest CI.
// It compiles only the headless modules and never downloads model weights.
it('passes the isolated Node worker-protocol regression suite', () => {
  const script = resolve('scripts/test-local-ai.cjs');
  const output = execFileSync(process.execPath, [script], {
    encoding: 'utf8',
    timeout: 30_000,
  });
  expect(output).toContain('# fail 0');
}, 35_000);
