import { type Command, LocalAIError, messagesFor, MODEL, type WorkerEvent } from './protocol.js';
import { type LoadedModel, loadModel } from './runtime.js';

// One model and one admitted operation per Worker. Termination is owned by the
// client: cancellation must also work while download/initialization is blocked.
export function createEngine(
  emit: (event: WorkerEvent) => void,
  load: typeof loadModel = loadModel,
) {
  let model: LoadedModel | null = null;
  let busy = false;
  return async (command: Command): Promise<void> => {
    if (busy) return;
    busy = true;
    try {
      if (command.type === 'load') {
        model ??= await load((progress) => emit({ ...progress, id: command.id }));
        emit({ type: 'ready', id: command.id });
        return;
      }
      if (!model) throw new LocalAIError('load');
      const prompt = model.generator.tokenizer.apply_chat_template(
        messagesFor(command.request),
        { tokenize: false, add_generation_prompt: true },
      );
      const tokens = model.generator.tokenizer(prompt, { add_special_tokens: false });
      if (tokens.input_ids.size > MODEL.maxPromptTokens) {
        throw new LocalAIError('inputTooLong');
      }
      const result = await model.generator(prompt, {
        max_new_tokens: MODEL.maxNewTokens,
        do_sample: false,
        add_special_tokens: false,
        return_full_text: false,
        streamer: model.streamer((text) => emit({ type: 'token', id: command.id, text })),
      });
      const text = result[0]?.generated_text;
      if (typeof text !== 'string') throw new LocalAIError('generation');
      emit({ type: 'complete', id: command.id, text });
    } catch (error) {
      // Only fixed codes cross the boundary; exceptions can contain user text.
      emit({ type: 'error', id: command.id, code: error instanceof LocalAIError
        ? error.code : command.type === 'load' ? 'load' : 'generation' });
    } finally {
      busy = false;
    }
  };
}
