import { deleteStaleLocalAIDownloads } from './caches';
import { isModelCached } from './modelCache';
import { MAX_NEW_TOKENS, MODEL, MODEL_OPTIONS } from './modelCatalog';
import { createProgressReporter } from './progress';
import { createRepetitionGuard, type Logits } from './repetition';
import type {
  GenerativeModel,
  Interruptor,
  RuntimeProgress,
  Tokenizer,
  TransformersRuntime,
} from './runtime';
import { buildMessages, checkTokenBudget } from './tasks';
import type { AICommand, AIEvent, AIRequest } from './types';
import { LocalAIError } from './types';

interface Session {
  runtime: TransformersRuntime;
  tokenizer: Tokenizer;
  model: GenerativeModel;
}

// No React and no browser globals: the worker owns exactly one engine, and
// tests inject a deterministic runtime rather than downloading a model in CI.
export class LocalAIEngine {
  private active: { id: number; kind: AICommand['type'] } | null = null;
  private interrupted = false;
  private interruptor: Interruptor | null = null;
  private runtimePromise: Promise<TransformersRuntime> | null = null;
  private sessionPromise: Promise<Session> | null = null;

  constructor(
    private readonly send: (event: AIEvent) => void,
    private readonly check: () => Promise<void>,
    private readonly load: () => Promise<TransformersRuntime>,
    private readonly inspectCache: () => Promise<boolean> = isModelCached,
  ) {}

  async handle(command: AICommand): Promise<void> {
    // Cancellation must not queue behind the in-flight generate promise.
    if (command.type === 'cancel') {
      if (this.active?.id === command.id && this.active.kind === 'generate') {
        this.interrupted = true;
        this.interruptor?.interrupt();
        this.send({ type: 'cancelling', id: command.id });
      }
      return;
    }
    if (command.type === 'count') {
      await this.count(command.id, command.request);
      return;
    }
    if (this.active) return; // the client already rejects duplicate submissions
    this.active = { id: command.id, kind: command.type };
    this.interrupted = false;
    try {
      if (command.type === 'inspect') {
        await this.check();
        this.send({
          type: 'available',
          id: command.id,
          info: await this.inspect(),
        });
      } else if (command.type === 'prepare') {
        await this.check();
        await this.prepare(command.id, command.cacheOnly);
      } else {
        await this.generate(command.id, command.request);
      }
    } catch (error) {
      // Raw model exceptions can embed user content. Only allowlisted codes
      // cross back to the UI — never a message, console.log or telemetry body.
      const code =
        error instanceof LocalAIError
          ? error.code
          : error instanceof Error && error.name === 'QuotaExceededError'
            ? 'storage'
            : command.type === 'generate'
              ? 'generation'
              : command.type === 'inspect'
                ? 'inspect'
                : 'load';
      this.send({ type: 'error', id: command.id, code });
    } finally {
      this.active = null;
      this.interruptor = null;
    }
  }

  private async prepare(id: number, cacheOnly: boolean): Promise<void> {
    const cached = await this.inspectCache();
    if (cacheOnly && !cached) {
      this.send({
        type: 'available',
        id,
        info: { bytes: MODEL.downloadBytes, cached: false },
      });
      return;
    }
    if (cached) this.send({ type: 'progress', id, progress: 100 });
    await this.getSession(id, cacheOnly);
    const verified = await this.inspectCache().catch(() => false);
    await deleteStaleLocalAIDownloads().catch(() => undefined);
    this.send({ type: 'ready', id, cached: verified });
  }

  private async count(id: number, request: AIRequest): Promise<void> {
    try {
      const sessionPromise = this.sessionPromise;
      if (!sessionPromise) {
        this.send({ type: 'counted', id, tokens: null });
        return;
      }
      const { tokenizer } = await sessionPromise;
      const inputs = tokenizer.apply_chat_template(buildMessages(request), {
        tokenize: true,
        add_generation_prompt: true,
        return_dict: true,
      });
      const tokens = inputs.input_ids.dims.at(-1);
      this.send({
        type: 'counted',
        id,
        tokens:
          Number.isSafeInteger(tokens) && tokens && tokens > 0 ? tokens : null,
      });
    } catch {
      this.send({ type: 'counted', id, tokens: null });
    }
  }

  // The model revision/dtype and exact download byte count are pinned together.
  // Inspection therefore needs no Hugging Face Range metadata requests: it only
  // loads the small runtime, probes the local cache, and reports the pinned size.
  private async inspect() {
    await this.getRuntime();
    const cached = await this.inspectCache();
    return { bytes: MODEL.downloadBytes, cached };
  }

  private getRuntime(): Promise<TransformersRuntime> {
    this.runtimePromise ??= this.load().catch((error) => {
      this.runtimePromise = null;
      throw error;
    });
    return this.runtimePromise;
  }

  private getSession(id: number, localFilesOnly: boolean): Promise<Session> {
    this.sessionPromise ??= (async () => {
      const runtime = await this.getRuntime();
      const progressReporter = createProgressReporter((value) => {
        this.send({ type: 'progress', id, progress: value });
      });
      // The tokenizer (~6.7 MiB) gets no aggregate event, so its per-file ticks
      // go out without a percentage: an indeterminate bar, and a sign of life
      // for the client's stall timer, rather than a bar that fills twice.
      const tokenizer = await runtime.AutoTokenizer.from_pretrained(MODEL.id, {
        revision: MODEL.revision,
        local_files_only: localFilesOnly,
        progress_callback: (event: RuntimeProgress) => {
          if (event.status === 'progress') progressReporter.report(null);
        },
      });
      const model = await runtime.AutoModelForCausalLM.from_pretrained(
        MODEL.id,
        {
          ...MODEL_OPTIONS,
          local_files_only: localFilesOnly,
          // The default wrapper emits a `progress_total` right before every
          // per-file `progress`. Forwarding both made the bar alternate between
          // the overall and the per-file percentage at twice the message rate;
          // the aggregate is the one number a user can act on.
          progress_callback: (event: RuntimeProgress) => {
            if (event.status === 'progress_total') {
              const progress =
                typeof event.progress === 'number' &&
                Number.isFinite(event.progress)
                  ? Math.max(0, Math.min(100, event.progress))
                  : null;
              progressReporter.report(progress);
            } else if (
              event.status === 'progress' &&
              !progressReporter.hasAggregate
            ) {
              progressReporter.report(null);
            }
          },
        },
      );
      try {
        // An adapter is not proof that this model can execute. A one-token
        // warm-up surfaces unsupported operators and allocation failures here
        // instead of on the user's first real prompt.
        const inputs = tokenizer.apply_chat_template(
          [{ role: 'user', content: 'Hello' }],
          { tokenize: true, add_generation_prompt: true, return_dict: true },
        );
        await model.generate({
          ...inputs,
          max_new_tokens: 1,
          do_sample: false,
          repetition_penalty: 1,
          no_repeat_ngram_size: 0,
        });
      } catch (error) {
        await model.dispose().catch(() => undefined);
        throw error;
      }
      progressReporter.report(100, true);
      return { runtime, tokenizer, model };
    })().catch((error) => {
      this.sessionPromise = null;
      throw error;
    });
    return this.sessionPromise;
  }

  private async generate(id: number, request: AIRequest): Promise<void> {
    const messages = buildMessages(request);
    // Generation never implicitly downloads a model.
    if (!this.sessionPromise) throw new LocalAIError('load');
    const { runtime, tokenizer, model } = await this.sessionPromise;
    const inputs = tokenizer.apply_chat_template(messages, {
      tokenize: true,
      add_generation_prompt: true,
      return_dict: true,
    });
    const promptLength = inputs.input_ids.dims.at(-1) ?? 0;
    checkTokenBudget(promptLength);
    this.interruptor = new runtime.InterruptableStoppingCriteria();
    if (this.interrupted) this.interruptor.interrupt();
    const startedAt = performance.now();
    let firstTokenAt: number | null = null;
    let outputTokens = 0;
    const guard = createRepetitionGuard(promptLength);
    const streamer = new runtime.TextStreamer(tokenizer, {
      skip_prompt: true,
      callback_function: (text) => {
        if (!this.interrupted && text) {
          firstTokenAt ??= performance.now();
          this.send({ type: 'delta', id, text });
        }
      },
    });
    await model.generate({
      ...inputs,
      max_new_tokens: MAX_NEW_TOKENS,
      do_sample: false,
      repetition_penalty: 1,
      no_repeat_ngram_size: 0,
      logits_processor: [
        (inputIds: bigint[][], logits: Logits) => {
          outputTokens = Math.max(
            outputTokens,
            inputIds[0].length - promptLength + 1,
          );
          return guard(inputIds, logits);
        },
      ],
      streamer,
      stopping_criteria: [this.interruptor],
    });
    if (this.interrupted) {
      this.send({ type: 'cancelled', id });
    } else {
      const finishedAt = performance.now();
      const generationSeconds =
        firstTokenAt === null ? 0 : (finishedAt - firstTokenAt) / 1000;
      this.send({
        type: 'complete',
        id,
        metrics: {
          outputTokens,
          tokensPerSecond:
            outputTokens > 0 && generationSeconds > 0
              ? outputTokens / generationSeconds
              : null,
          timeToFirstTokenMs:
            firstTokenAt === null ? null : firstTokenAt - startedAt,
        },
      });
    }
  }
}
