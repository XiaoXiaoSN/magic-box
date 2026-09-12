import { MAX_NEW_TOKENS, MODEL, MODEL_OPTIONS } from './modelCatalog';
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
  ) {}

  async handle(command: AICommand): Promise<void> {
    // Cancellation must not queue behind the in-flight generate promise.
    if (command.type === 'cancel') {
      if (this.active?.id === command.id && this.active.kind === 'generate') {
        this.interrupted = true;
        this.interruptor?.interrupt();
      }
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
        await this.getSession(command.id);
        this.send({ type: 'ready', id: command.id });
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
                ? 'metadata'
                : 'load';
      this.send({ type: 'error', id: command.id, code });
    } finally {
      this.active = null;
      this.interruptor = null;
    }
  }

  // Metadata only: resolves the real download size from the registry so the UI
  // never has to hardcode an approximate MiB figure, and requests no weights.
  private async inspect() {
    const runtime = await this.getRuntime();
    const files = await runtime.ModelRegistry.get_pipeline_files(
      'text-generation',
      MODEL.id,
      MODEL_OPTIONS,
    );
    const metadata = await Promise.all(
      files.map((file) =>
        runtime.ModelRegistry.get_file_metadata(MODEL.id, file, {
          revision: MODEL.revision,
        }),
      ),
    );
    if (
      !metadata.length ||
      metadata.some(
        (file) =>
          !file.exists ||
          file.size === null ||
          !Number.isSafeInteger(file.size) ||
          file.size < 0,
      )
    ) {
      throw new LocalAIError('metadata');
    }
    const bytes = metadata.reduce((total, file) => total + (file.size ?? 0), 0);
    if (!Number.isSafeInteger(bytes) || bytes <= 0) {
      throw new LocalAIError('metadata');
    }
    const cached = await runtime.ModelRegistry.is_pipeline_cached(
      'text-generation',
      MODEL.id,
      MODEL_OPTIONS,
    );
    return { bytes, cached };
  }

  private getRuntime(): Promise<TransformersRuntime> {
    this.runtimePromise ??= this.load().catch((error) => {
      this.runtimePromise = null;
      throw error;
    });
    return this.runtimePromise;
  }

  private getSession(id: number): Promise<Session> {
    this.sessionPromise ??= (async () => {
      const runtime = await this.getRuntime();
      const tokenizer = await runtime.AutoTokenizer.from_pretrained(MODEL.id, {
        revision: MODEL.revision,
      });
      const model = await runtime.AutoModelForCausalLM.from_pretrained(
        MODEL.id,
        {
          ...MODEL_OPTIONS,
          progress_callback: (event: RuntimeProgress) => {
            if (
              event.status !== 'progress' &&
              event.status !== 'progress_total'
            )
              return;
            const progress =
              typeof event.progress === 'number' &&
              Number.isFinite(event.progress)
                ? Math.max(0, Math.min(100, event.progress))
                : null;
            this.send({
              type: 'progress',
              id,
              file: event.file ?? '',
              progress,
            });
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
        });
      } catch (error) {
        await model.dispose().catch(() => undefined);
        throw error;
      }
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
    checkTokenBudget(inputs.input_ids.dims.at(-1) ?? 0);
    this.interruptor = new runtime.InterruptableStoppingCriteria();
    if (this.interrupted) this.interruptor.interrupt();
    const streamer = new runtime.TextStreamer(tokenizer, {
      skip_prompt: true,
      callback_function: (text) => {
        if (!this.interrupted && text) this.send({ type: 'delta', id, text });
      },
    });
    await model.generate({
      ...inputs,
      max_new_tokens: MAX_NEW_TOKENS,
      do_sample: false,
      streamer,
      stopping_criteria: [this.interruptor],
    });
    this.send({ type: this.interrupted ? 'cancelled' : 'complete', id });
  }
}
