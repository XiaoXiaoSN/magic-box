// @vitest-environment node

import { execFile } from 'node:child_process';
import { EventEmitter, once } from 'node:events';
import { mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { promisify } from 'node:util';
import { describe, expect, it, vi } from 'vitest';
import { preprocessCypressFile } from '../cypress.config';

const execFileAsync = promisify(execFile);

class SpecFile extends EventEmitter implements Cypress.FileObject {
  constructor(
    readonly filePath: string,
    readonly outputPath: string,
    readonly shouldWatch: boolean,
  ) {
    super();
  }
}

function nextRerun(file: SpecFile) {
  return once(file, 'rerun', { signal: AbortSignal.timeout(5000) });
}

describe('Cypress Bun preprocessor', () => {
  it('rebuilds the spec and imported graph once per save and releases its watchers on close', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'cypress-watch-test-'));
    const file = new SpecFile(
      join(directory, 'sample.cy.ts'),
      join(directory, 'output.js'),
      true,
    );
    const helper = join(directory, 'helper.ts');
    const leaf = join(directory, 'leaf.ts');
    const onRerun = vi.fn();
    file.on('rerun', onRerun);

    try {
      await writeFile(
        file.filePath,
        'import { helper } from "./helper"; console.log("spec-before", helper);',
      );
      await writeFile(helper, 'export { leaf as helper } from "./leaf";');
      await writeFile(leaf, 'export const leaf = "leaf-before";');
      const initial = preprocessCypressFile(file);
      expect(preprocessCypressFile(file)).toBe(initial);
      expect(file.listenerCount('close')).toBe(1);
      const outputPath = await initial;
      expect(await readFile(outputPath, 'utf8')).toContain('leaf-before');

      const specRerun = nextRerun(file);
      await writeFile(
        file.filePath,
        'import { helper } from "./helper"; console.log("spec-after", helper);',
      );
      await specRerun;
      expect(await preprocessCypressFile(file)).toBe(outputPath);
      expect(await readFile(outputPath, 'utf8')).toContain('spec-after');

      const helperRerun = nextRerun(file);
      const staged = join(directory, 'save.tmp');
      await writeFile(staged, 'export const leaf = "leaf-after";');
      await rename(staged, leaf);
      await helperRerun;
      expect(await readFile(outputPath, 'utf8')).toContain('leaf-after');
      await delay(400);
      expect(onRerun).toHaveBeenCalledTimes(2);

      file.emit('close');
      expect(file.listenerCount('close')).toBe(0);
      await expect
        .poll(() => readFile(outputPath, 'utf8').catch(() => null))
        .toBe(null);
      await writeFile(leaf, 'export const leaf = "leaf-after-close";');
      await delay(400);
      expect(onRerun).toHaveBeenCalledTimes(2);

      const reopened = await preprocessCypressFile(file);
      expect(reopened).not.toBe(outputPath);
      expect(await readFile(reopened, 'utf8')).toContain('leaf-after-close');
    } finally {
      file.emit('close');
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('recovers missing imports and invalid edits while keeping the previous bundle intact', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'cypress-recovery-test-'));
    const file = new SpecFile(
      join(directory, 'sample.cy.ts'),
      join(directory, 'output.js'),
      true,
    );
    const helper = join(directory, 'new-helper.ts');
    const reportBuildError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    try {
      await writeFile(file.filePath, 'import "./new-helper";');
      await expect(preprocessCypressFile(file)).rejects.toThrow(
        'Could not resolve',
      );

      const rerun = nextRerun(file);
      await writeFile(helper, 'console.log("restored");');
      await rerun;
      const outputPath = await preprocessCypressFile(file);
      expect(await readFile(outputPath, 'utf8')).toContain('restored');

      await writeFile(helper, 'export const = ;');
      await expect.poll(() => reportBuildError.mock.calls.length).toBe(1);
      await expect(preprocessCypressFile(file)).rejects.toThrow(
        'Expected identifier',
      );
      expect(await readFile(outputPath, 'utf8')).toContain('restored');

      const repaired = nextRerun(file);
      await writeFile(helper, 'console.log("repaired");');
      await repaired;
      expect(await readFile(outputPath, 'utf8')).toContain('repaired');
    } finally {
      file.emit('close');
      reportBuildError.mockRestore();
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('runs the non-watch build once and exits without closing a watcher', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'cypress-run-test-'));
    const filePath = join(directory, 'sample.cy.ts');
    try {
      await writeFile(filePath, 'console.log("one-shot bundle");');
      const { stdout } = await execFileAsync(
        process.execPath,
        [
          '--no-warnings',
          '--input-type=module',
          '--eval',
          `import { EventEmitter } from 'node:events';
        import { readFile, rm } from 'node:fs/promises';
        import { preprocessCypressFile } from './cypress/preprocess.ts';
        const file = Object.assign(new EventEmitter(), { filePath: process.argv[1], shouldWatch: false });
        const output = await preprocessCypressFile(file);
        console.log(JSON.stringify({ bundle: await readFile(output, 'utf8'), closeListeners: file.listenerCount('close') }));
        await rm(output);`,
          filePath,
        ],
        { timeout: 4000 },
      );
      expect(JSON.parse(stdout)).toEqual({
        bundle: expect.stringContaining('one-shot bundle'),
        closeListeners: 0,
      });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
