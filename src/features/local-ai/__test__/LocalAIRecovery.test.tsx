import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import { LocaleProvider } from '../../../contexts/LocaleContext';
import { PreferencesProvider } from '../../../contexts/PreferencesContext';
import { LocalAIEngine } from '../engine';
import LocalAIPanel from '../LocalAIPanel';
import { MODEL_CACHE_FILES } from '../modelCache';
import {
  MODEL,
  MODEL_CACHE,
  RUNTIME_CACHE,
  RUNTIME_URL,
  RUNTIME_VERSION,
} from '../modelCatalog';
import { loadRuntime, type TransformersRuntime } from '../runtime';
import type { AICommand } from '../types';
import { FakeWorker } from './fakeWorker';

const wasmUrl = 'https://cdn.jsdelivr.net/ort-test.wasm';
const factoryUrl = 'https://cdn.jsdelivr.net/ort-test.mjs';
const modelBase = `https://huggingface.co/${MODEL.id}/resolve/${MODEL.revision}/`;
const weightsUrl = `${modelBase}onnx/model_${MODEL.dtype}.onnx`;

const createCache = (urls: string[]) => {
  const entries = new Map(urls.map((url) => [url, new Response(url)]));
  return {
    match: async (url: string) => entries.get(url)?.clone(),
    put: async (url: string, response: Response) => {
      entries.set(url, response.clone());
    },
    delete: (url: string) => entries.delete(url),
  };
};

class EngineWorker extends FakeWorker {
  private readonly engine: LocalAIEngine;
  settled = Promise.resolve();

  constructor(importModule: () => Promise<TransformersRuntime>) {
    super();
    this.engine = new LocalAIEngine(
      (data) => this.onmessage?.(new MessageEvent('message', { data })),
      async () => {},
      (cacheOnly) =>
        loadRuntime(cacheOnly, {
          importModule,
          createObjectURL: () => 'blob:local-ai-test',
          revokeObjectURL: () => {},
        }),
    );
  }

  override postMessage(command: AICommand): void {
    super.postMessage(command);
    this.settled = this.engine.handle(command);
  }
}

afterEach(() => {
  cleanup();
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('offers explicit download after a verified runtime cache entry disappears while hidden', async () => {
  vi.useFakeTimers();
  const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  const runtimeCache = createCache([RUNTIME_URL]);
  const modelCache = createCache([
    wasmUrl,
    factoryUrl,
    ...MODEL_CACHE_FILES.map((file) => `${modelBase}${file}`),
  ]);
  const cacheNames = new Map([
    [RUNTIME_CACHE, runtimeCache],
    [MODEL_CACHE, modelCache],
  ]);
  vi.stubGlobal('caches', {
    open: async (name: string) => cacheNames.get(name),
    match: async (url: string, options?: MultiCacheQueryOptions) =>
      cacheNames.get(options?.cacheName ?? '')?.match(url),
    keys: async () => [...cacheNames.keys()],
  });
  const fetcher = vi.fn(async (url: RequestInfo | URL) => {
    expect(url).toBe(RUNTIME_URL);
    return new Response('runtime source');
  });
  vi.stubGlobal('fetch', fetcher);

  // Supply a Transformers fixture so the real runtime loader, cache probes,
  // engine, client and panel can drive recovery without GPU inference.
  const loadWeights = vi.fn();
  const importModule = async () => {
    const runtime: TransformersRuntime = {
      env: {
        version: RUNTIME_VERSION,
        allowLocalModels: false,
        allowRemoteModels: true,
        useBrowserCache: true,
        useWasmCache: true,
        cacheKey: '',
        remotePathTemplate: '',
        logLevel: 0,
        fetch: fetcher,
        backends: {
          onnx: {
            wasm: {
              numThreads: 1,
              proxy: false,
              wasmPaths: { wasm: wasmUrl, mjs: factoryUrl },
            },
          },
        },
      },
      LogLevel: { NONE: 50 },
      ModelRegistry: {
        async is_pipeline_cached() {
          throw new Error('Inspection must not enter the upstream registry');
        },
      },
      AutoTokenizer: {
        async from_pretrained() {
          return {
            apply_chat_template: () => ({ input_ids: { dims: [1, 5] } }),
          };
        },
      },
      AutoModelForCausalLM: {
        async from_pretrained(_model, options) {
          loadWeights(options.local_files_only);
          if (
            options.local_files_only ||
            !(await modelCache.match(weightsUrl))
          ) {
            await runtime.env.fetch(weightsUrl);
          }
          return { generate: async () => {}, dispose: async () => {} };
        },
      },
      TextStreamer: class {},
      InterruptableStoppingCriteria: class {
        interrupt() {}
      },
    };
    return runtime;
  };

  const workers: EngineWorker[] = [];
  const createWorker = () => {
    const worker = new EngineWorker(importModule);
    workers.push(worker);
    return worker;
  };
  render(
    <LocaleProvider>
      <PreferencesProvider>
        <LocalAIPanel createWorker={createWorker} />
      </PreferencesProvider>
    </LocaleProvider>,
  );
  await act(() => workers[0].settled);
  const setupButton = () => screen.getByTestId('local-ai-setup');
  expect(setupButton()).toHaveTextContent('Load model · 467.3 MiB');
  fireEvent.click(setupButton());
  await act(() => workers[0].settled);
  expect(screen.getByRole('status')).toHaveTextContent('Model ready');
  expect(loadWeights.mock.calls).toEqual([[true]]);
  expect(fetcher).not.toHaveBeenCalled();

  hidden.mockReturnValue(true);
  fireEvent(document, new Event('visibilitychange'));
  act(() => vi.advanceTimersByTime(30_000));
  expect(workers[0].terminated).toBe(true);
  expect(runtimeCache.delete(RUNTIME_URL)).toBe(true);

  hidden.mockReturnValue(false);
  fireEvent(document, new Event('visibilitychange'));
  expect(workers[1].commands).toEqual([
    { type: 'prepare', id: 3, cacheOnly: true },
  ]);
  await act(() => workers[1].settled);
  expect(fetcher).not.toHaveBeenCalled();
  expect(loadWeights.mock.calls).toEqual([[true]]);
  expect(screen.getByRole('status')).toHaveTextContent('Ready to download');
  expect(setupButton()).toHaveTextContent('Download model · 467.3 MiB');
  expect(screen.getByTestId('local-ai-setup-note')).toHaveTextContent(
    'jsDelivr and Hugging Face',
  );

  fireEvent.click(setupButton());
  expect(workers[1].commands.at(-1)).toEqual({
    type: 'prepare',
    id: 4,
    cacheOnly: false,
  });
  await act(() => workers[1].settled);
  expect(fetcher).toHaveBeenCalledExactlyOnceWith(RUNTIME_URL, undefined);
  expect(loadWeights.mock.calls).toEqual([[true], [false]]);
  expect(screen.getByRole('status')).toHaveTextContent('Model ready');
  expect(await runtimeCache.match(RUNTIME_URL)).toBeInstanceOf(Response);
});
