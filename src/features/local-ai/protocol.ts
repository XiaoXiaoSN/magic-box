export const MODEL = {
  id: 'onnx-community/Qwen2.5-0.5B-Instruct',
  revision: 'cc5cc01a65cc3ff17bdb73a7de33d879f62599b0',
  dtype: 'q4f16',
  cache: 'magic-box-local-ai-v1',
  maxInputChars: 6000,
  maxPromptTokens: 1024,
  maxNewTokens: 256,
} as const;

// A fixed browser build, imported only inside the Worker after consent.
export const RUNTIME_URL =
  'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0';

export type Task = 'ask' | 'translate' | 'rewrite' | 'summarize';
export type Language = 'zh-TW' | 'en' | 'ja';
export interface AIRequest {
  input: string;
  task: Task;
  language: Language;
}
export type ErrorCode =
  | 'insecure'
  | 'unsupported'
  | 'fp16'
  | 'load'
  | 'generation'
  | 'invalidInput'
  | 'inputTooLong'
  | 'worker'
  | 'timeout'
  | 'cache';

export class LocalAIError extends Error {
  readonly code: ErrorCode;
  constructor(code: ErrorCode) {
    super(code);
    this.code = code;
  }
}

export type Command =
  | { type: 'load'; id: number }
  | { type: 'generate'; id: number; request: AIRequest };
export type WorkerEvent =
  | { type: 'progress'; id: number; file: string; percent: number | null }
  | { type: 'ready'; id: number }
  | { type: 'token'; id: number; text: string }
  | { type: 'complete'; id: number; text: string }
  | { type: 'error'; id: number; code: ErrorCode };

export function validateRequest(request: AIRequest): void {
  if (
    typeof request?.input !== 'string' ||
    !request.input.trim() ||
    !['ask', 'translate', 'rewrite', 'summarize'].includes(request.task) ||
    !['zh-TW', 'en', 'ja'].includes(request.language)
  ) {
    throw new LocalAIError('invalidInput');
  }
  if (request.input.length > MODEL.maxInputChars) {
    throw new LocalAIError('inputTooLong');
  }
}

export function messagesFor(request: AIRequest) {
  validateRequest(request);
  const language = { 'zh-TW': 'Traditional Chinese', en: 'English', ja: 'Japanese' }[
    request.language
  ];
  const instruction = {
    ask: 'Answer the question briefly. Acknowledge uncertainty instead of inventing facts.',
    translate: 'Translate the user text. Return only the translation.',
    rewrite: 'Rewrite the user text clearly and politely without changing its meaning. Return only the rewrite.',
    summarize: 'Summarize the user text briefly. Do not add facts that are not in the text.',
  }[request.task];
  return [
    { role: 'system', content: `${instruction} Respond in ${language}.` },
    { role: 'user', content: request.input.trim() },
  ];
}
