export type AITask = 'ask' | 'translate' | 'rewrite' | 'summarize';
export type AILanguage = 'zh-TW' | 'en' | 'ja';
// The stored preference adds `auto`, which follows the app locale. It is
// resolved to a concrete AILanguage before a request is built, so the worker
// protocol never sees `auto`.
export type AILanguagePref = 'auto' | AILanguage;
export type AIErrorCode =
  | 'unsupported'
  | 'storage'
  | 'metadata'
  | 'load'
  | 'generation'
  | 'inputLimit'
  | 'invalidRequest'
  | 'timeout';

export interface AIRequest {
  input: string;
  task: AITask;
  language: AILanguage;
}

export interface ModelInfo {
  bytes: number;
  cached: boolean;
}

export type AICommand =
  | { type: 'inspect'; id: number }
  | { type: 'prepare'; id: number }
  | { type: 'cancel'; id: number }
  | { type: 'generate'; id: number; request: AIRequest };

export type AIEvent =
  | { type: 'available'; id: number; info: ModelInfo }
  // `progress` is the aggregate model download in percent, or null while only
  // a sign of life is known (the tokenizer files).
  | { type: 'progress'; id: number; progress: number | null }
  | { type: 'ready' | 'complete' | 'cancelled'; id: number }
  | { type: 'delta'; id: number; text: string }
  | { type: 'error'; id: number; code: AIErrorCode };

export type AIPhase =
  | 'idle'
  | 'inspecting'
  | 'available'
  | 'loading'
  | 'ready'
  | 'generating'
  | 'stopping'
  | 'stopped'
  | 'complete'
  | 'error';

export interface AIState {
  phase: AIPhase;
  loaded: boolean;
  info: ModelInfo | null;
  output: string;
  submitted: AIRequest | null;
  error: AIErrorCode | null;
  progress: { percent: number | null } | null;
}

export class LocalAIError extends Error {
  constructor(readonly code: AIErrorCode) {
    super(code);
    this.name = 'LocalAIError';
  }
}

export const isBusy = (phase: AIPhase): boolean =>
  ['inspecting', 'loading', 'generating', 'stopping'].includes(phase);
