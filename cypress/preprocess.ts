import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  type BigIntStats,
  type FSWatcher,
  renameSync,
  statSync,
  watch,
} from 'node:fs';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, extname, join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const preprocessorDir = join(tmpdir(), 'magic-box-cypress-preprocessor');
const execOptions = { maxBuffer: 10 * 1024 * 1024 };
const watchScript =
  typeof __dirname === 'string'
    ? join(__dirname, 'preprocess-watch.mjs')
    : fileURLToPath(new URL('./preprocess-watch.mjs', import.meta.url));
const watchBuilds = new Map<string, WatchedBuild>();
const rebuildDelay = 100;

type FileSnapshot = [path: string, modified: string | null];
interface BuildResult {
  files: FileSnapshot[];
  importDirectories?: FileSnapshot[];
  error?: string;
}

interface DirectoryWatch {
  watcher: FSWatcher;
  device: bigint;
  inode: bigint;
  files: Map<string, string | undefined>;
  directoryStamp?: string;
}

function stamp(info: BigIntStats | undefined): string | undefined {
  return info && `${info.ino}:${info.size}:${info.mtimeNs}:${info.ctimeNs}`;
}

const readInfo = (path: string) =>
  statSync(path, { bigint: true, throwIfNoEntry: false });

class WatchedBuild {
  private readonly outputDirectory = mkdtemp(`${preprocessorDir}-watch-`);
  private readonly lifetime = new AbortController();
  private readonly directories = new Map<string, DirectoryWatch>();
  private readonly file: Cypress.FileObject;
  private files = new Set<string>();
  private scheduled = false;
  private latest: Promise<string>;

  constructor(file: Cypress.FileObject) {
    this.file = file;
    this.files.add(file.filePath);
    this.latest = this.build();
    this.updateWatches([]);
    file.once('close', this.close);
  }

  get output(): Promise<string> {
    return this.latest;
  }

  private updateWatches(importDirectories: FileSnapshot[]): void {
    // Watch parent directories so an editor's rename does not detach the
    // watcher from the path. One watcher covers all dependencies in a folder.
    const targets = new Map<
      string,
      { allEntries: boolean; filenames: Set<string> }
    >();
    const add = (directory: string, filename?: string): void => {
      while (!readInfo(directory)?.isDirectory()) {
        filename = basename(directory);
        directory = dirname(directory);
      }
      const target = targets.get(directory) ?? {
        allEntries: false,
        filenames: new Set<string>(),
      };
      if (filename) target.filenames.add(filename);
      else target.allEntries = true;
      targets.set(directory, target);
    };
    for (const path of this.files) add(dirname(path), basename(path));
    for (const [path] of importDirectories) add(path);

    for (const [directory, entry] of this.directories) {
      if (targets.has(directory)) continue;
      entry.watcher.close();
      this.directories.delete(directory);
    }
    for (const [directory, target] of targets) {
      const read = (filename: string) =>
        stamp(readInfo(join(directory, filename)));
      const info = readInfo(directory);
      if (!info?.isDirectory()) {
        this.schedule();
        continue;
      }
      const files = new Map(
        [...target.filenames].map((name) => [name, read(name)]),
      );
      const directoryStamp = target.allEntries ? stamp(info) : undefined;
      const existing = this.directories.get(directory);
      if (existing?.inode === info.ino && existing.device === info.dev) {
        existing.files = files;
        existing.directoryStamp = directoryStamp;
        continue;
      }
      if (existing) this.dropWatch(directory, existing);
      try {
        const watcher = watch(directory, (_event, filename) => {
          const current = readInfo(directory);
          if (current?.ino !== info.ino || current?.dev !== info.dev) {
            this.dropWatch(directory, entry);
            this.schedule();
            return;
          }
          if (entry.directoryStamp !== undefined) {
            const modified = stamp(current);
            if (modified !== entry.directoryStamp) this.schedule();
            entry.directoryStamp = modified;
          }
          // Some platforms replay events from before watch() started. Check
          // the snapshots to ignore those and duplicate events for one write.
          for (const name of filename ? [filename] : entry.files.keys()) {
            if (!entry.files.has(name)) continue;
            const modified = read(name);
            if (modified !== entry.files.get(name)) this.schedule();
            entry.files.set(name, modified);
          }
        });
        const entry = {
          watcher,
          device: info.dev,
          inode: info.ino,
          files,
          directoryStamp,
        };
        this.directories.set(directory, entry);
        watcher.on('error', (error) => {
          this.dropWatch(directory, entry);
          if ((error as NodeJS.ErrnoException).code === 'ENOENT')
            this.schedule();
          else console.error(error);
        });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        // A directory was removed between its stat and watch calls.
        this.schedule();
      }
    }
  }

  private dropWatch(directory: string, entry: DirectoryWatch): void {
    if (this.directories.get(directory) !== entry) return;
    entry.watcher.close();
    this.directories.delete(directory);
  }

  private readonly schedule = (): void => {
    if (this.scheduled || this.lifetime.signal.aborted) return;
    this.scheduled = true;
    const pending = Promise.allSettled([
      this.latest,
      delay(rebuildDelay, undefined, { signal: this.lifetime.signal }),
    ]).then(() => {
      this.scheduled = false;
      return this.build();
    });
    this.latest = pending;
    void pending.then(
      () => {
        if (this.latest === pending && !this.lifetime.signal.aborted) {
          this.file.emit('rerun');
        }
      },
      (error: unknown) => {
        if (!this.lifetime.signal.aborted) console.error(error);
      },
    );
  };

  private async build(): Promise<string> {
    const directory = await this.outputDirectory;
    this.lifetime.signal.throwIfAborted();
    const outputPath = join(directory, 'spec.js');
    const stagedPath = join(directory, 'building.js');
    const { stdout } = await execFileAsync(
      'bun',
      [watchScript, this.file.filePath, stagedPath],
      { ...execOptions, signal: this.lifetime.signal },
    );
    this.lifetime.signal.throwIfAborted();
    const {
      files,
      importDirectories = [],
      error,
    } = JSON.parse(stdout) as BuildResult;
    this.files = new Set([
      this.file.filePath,
      ...(error ? this.files : []),
      ...files.map(([path]) => path),
    ]);
    this.updateWatches(importDirectories);
    for (const [path, modified] of [...files, ...importDirectories]) {
      // A newly discovered dependency may have changed while Bun was building.
      if ((stamp(readInfo(path)) ?? null) !== modified) {
        this.schedule();
      }
    }
    if (error) throw new Error(error);
    renameSync(stagedPath, outputPath);
    return outputPath;
  }

  private readonly close = (): void => {
    this.lifetime.abort();
    watchBuilds.delete(this.file.filePath);
    for (const { watcher } of this.directories.values()) watcher.close();
    this.directories.clear();
    void Promise.allSettled([this.outputDirectory, this.latest])
      .then(([directory]) => {
        if (directory.status === 'fulfilled') {
          return rm(directory.value, { recursive: true, force: true });
        }
      })
      .catch(console.error);
  };
}

// Use the pinned Bun toolchain so Cypress does not load a mismatched webpack TypeScript compiler.
async function buildOnce(filePath: string): Promise<string> {
  await mkdir(preprocessorDir, { recursive: true });
  const fileKey = createHash('sha256')
    .update(filePath)
    .digest('hex')
    .slice(0, 12);
  const outputPath = join(
    preprocessorDir,
    `${basename(filePath, extname(filePath))}-${fileKey}.js`,
  );
  await execFileAsync(
    'bun',
    [
      'build',
      filePath,
      '--target=browser',
      '--format=cjs',
      `--outfile=${outputPath}`,
    ],
    execOptions,
  );
  return outputPath;
}

export function preprocessCypressFile(
  file: Cypress.FileObject,
): Promise<string> {
  if (!file.shouldWatch) return buildOnce(file.filePath);

  let build = watchBuilds.get(file.filePath);
  if (!build) {
    build = new WatchedBuild(file);
    watchBuilds.set(file.filePath, build);
  }
  return build.output;
}
