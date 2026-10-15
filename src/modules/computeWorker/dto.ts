import type { Box, BoxOptions, BoxView } from '@modules/Box';

export const MAX_WORKER_INPUT_LENGTH = 1024 * 1024;
export const MAX_WORKER_SOURCE_COUNT = 256;
export const MAX_WORKER_BOX_COUNT = 64;
export const MAX_WORKER_STRING_LENGTH = 1024 * 1024;
export const MAX_WORKER_OPTION_COUNT = 128;

export interface WorkerBoxDTO {
  name: string;
  plaintextOutput: string;
  options: Record<string, string | boolean> | null;
  sourceInput?: string;
  view?: BoxView;
  priority?: number;
  showExpandButton?: boolean;
  disabled?: boolean;
  largeModal?: boolean;
  selected?: boolean;
  tag?: string;
  kind?: string;
}

export interface ComputeWorkerRunRequest {
  type: 'run';
  runId: string;
  input: string;
  options: Record<string, string | boolean> | null;
  sourceIds: string[];
  locale: string;
  timezone: string;
  timezoneOffset: number;
  timezoneMode: 'fixed' | 'system';
}

export interface ComputeWorkerCancelRequest {
  type: 'cancel';
  runId: string;
}

export type ComputeWorkerRequest =
  | ComputeWorkerRunRequest
  | ComputeWorkerCancelRequest;

export interface ComputeWorkerReadyEvent {
  type: 'ready';
}

export interface ComputeWorkerStartedEvent {
  type: 'started';
  runId: string;
}

export interface ComputeWorkerSourceLoadStartedEvent {
  type: 'source-load-start';
  runId: string;
  sourceId: string;
}

export interface ComputeWorkerSourceStartedEvent {
  type: 'source-start';
  runId: string;
  sourceId: string;
}

export interface ComputeWorkerSourceResultEvent {
  type: 'source-result';
  runId: string;
  sourceId: string;
  boxes: WorkerBoxDTO[];
}

export interface ComputeWorkerSourceErrorEvent {
  type: 'source-error';
  runId: string;
  sourceId: string;
  message: string;
}

export interface ComputeWorkerFinishedEvent {
  type: 'finished';
  runId: string;
}

export interface ComputeWorkerFailureEvent {
  type: 'failure';
  runId: string;
  message: string;
}

export type ComputeWorkerEvent =
  | ComputeWorkerReadyEvent
  | ComputeWorkerStartedEvent
  | ComputeWorkerSourceLoadStartedEvent
  | ComputeWorkerSourceStartedEvent
  | ComputeWorkerSourceResultEvent
  | ComputeWorkerSourceErrorEvent
  | ComputeWorkerFinishedEvent
  | ComputeWorkerFailureEvent;

const VIEWS: readonly BoxView[] = [
  'default',
  'code',
  'diff',
  'keyValue',
  'qrCode',
  'diceRoll',
  'localAI',
  'shortenURL',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === 'object' &&
    (Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null)
  );
}

function isBoundedString(
  value: unknown,
  max = MAX_WORKER_STRING_LENGTH,
): value is string {
  return typeof value === 'string' && value.length <= max;
}

function isNonEmptyBoundedString(
  value: unknown,
  max = MAX_WORKER_STRING_LENGTH,
): value is string {
  return isBoundedString(value, max) && value.length > 0;
}

function isOptionValue(value: unknown): value is string | boolean {
  return typeof value === 'boolean' || isBoundedString(value, 4096);
}

function isWorkerOptions(
  value: unknown,
): value is Record<string, string | boolean> | null {
  if (value === null) return true;
  if (!isRecord(value)) return false;
  const keys = Object.keys(value);
  if (keys.length > MAX_WORKER_OPTION_COUNT) return false;
  return keys.every(
    (key) => key.length > 0 && key.length <= 128 && isOptionValue(value[key]),
  );
}

function isBoxView(value: unknown): value is BoxView {
  return typeof value === 'string' && VIEWS.includes(value as BoxView);
}

export function isWorkerBoxDTO(value: unknown): value is WorkerBoxDTO {
  if (!isRecord(value)) return false;
  if (!isBoundedString(value.name, 512)) return false;
  if (!isBoundedString(value.plaintextOutput)) return false;
  if (!isWorkerOptions(value.options)) return false;
  if (value.sourceInput !== undefined && !isBoundedString(value.sourceInput)) {
    return false;
  }
  if (value.view !== undefined && !isBoxView(value.view)) return false;
  if (
    value.priority !== undefined &&
    (typeof value.priority !== 'number' || !Number.isFinite(value.priority))
  ) {
    return false;
  }
  for (const key of [
    'showExpandButton',
    'disabled',
    'largeModal',
    'selected',
  ] as const) {
    if (value[key] !== undefined && typeof value[key] !== 'boolean')
      return false;
  }
  for (const key of ['tag', 'kind'] as const) {
    if (value[key] !== undefined && !isBoundedString(value[key], 128)) {
      return false;
    }
  }
  return true;
}

export function isComputeWorkerRunRequest(
  value: unknown,
): value is ComputeWorkerRunRequest {
  if (!isRecord(value) || value.type !== 'run') return false;
  if (!isNonEmptyBoundedString(value.runId, 128)) return false;
  if (!isBoundedString(value.input, MAX_WORKER_INPUT_LENGTH)) return false;
  if (!isWorkerOptions(value.options)) return false;
  if (
    !Array.isArray(value.sourceIds) ||
    value.sourceIds.length > MAX_WORKER_SOURCE_COUNT ||
    value.sourceIds.some((sourceId) => !isNonEmptyBoundedString(sourceId, 256))
  ) {
    return false;
  }
  if (!isNonEmptyBoundedString(value.locale, 128)) return false;
  if (!isNonEmptyBoundedString(value.timezone, 128)) return false;
  if (
    typeof value.timezoneOffset !== 'number' ||
    !Number.isFinite(value.timezoneOffset) ||
    value.timezoneOffset < -12 ||
    value.timezoneOffset > 14 ||
    !Number.isInteger(value.timezoneOffset * 4)
  ) {
    return false;
  }
  if (value.timezoneMode !== 'fixed' && value.timezoneMode !== 'system') {
    return false;
  }
  return true;
}

export function isComputeWorkerRequest(
  value: unknown,
): value is ComputeWorkerRequest {
  if (!isRecord(value)) return false;
  if (value.type === 'run') return isComputeWorkerRunRequest(value);
  return value.type === 'cancel' && isNonEmptyBoundedString(value.runId, 128);
}

export function isComputeWorkerEvent(
  value: unknown,
): value is ComputeWorkerEvent {
  if (!isRecord(value) || typeof value.type !== 'string') return false;
  if (value.type === 'ready') return true;
  if (!isNonEmptyBoundedString(value.runId, 128)) return false;
  if (value.type === 'started' || value.type === 'finished') return true;
  if (value.type === 'source-load-start') {
    return isNonEmptyBoundedString(value.sourceId, 256);
  }
  if (value.type === 'source-start') {
    return isNonEmptyBoundedString(value.sourceId, 256);
  }
  if (value.type === 'source-error') {
    return (
      isNonEmptyBoundedString(value.sourceId, 256) &&
      isBoundedString(value.message, 4096)
    );
  }
  if (value.type === 'source-result') {
    return (
      isNonEmptyBoundedString(value.sourceId, 256) &&
      Array.isArray(value.boxes) &&
      value.boxes.length <= MAX_WORKER_BOX_COUNT &&
      value.boxes.every(isWorkerBoxDTO)
    );
  }
  if (value.type === 'failure') return isBoundedString(value.message, 4096);
  return false;
}

function cloneOptions(
  options: BoxOptions,
): Record<string, string | boolean> | null {
  if (options === null) return null;
  const result: Record<string, string | boolean> = Object.create(
    null,
  ) as Record<string, string | boolean>;
  for (const [key, value] of Object.entries(options)) {
    if (typeof value === 'string' || typeof value === 'boolean') {
      result[key] = value;
    }
  }
  return result;
}

export function toWorkerBox(box: Box): WorkerBoxDTO | null {
  if (box.boxTemplate !== undefined) return null;
  const props = box.props;
  const dto: WorkerBoxDTO = {
    name: props.name,
    plaintextOutput: props.plaintextOutput,
    options: cloneOptions(props.options),
  };
  if (props.sourceInput !== undefined) dto.sourceInput = props.sourceInput;
  if (box.view !== undefined) dto.view = box.view;
  if (props.priority !== undefined) dto.priority = props.priority;
  if (props.showExpandButton !== undefined) {
    dto.showExpandButton = props.showExpandButton;
  }
  if (props.disabled !== undefined) dto.disabled = props.disabled;
  if (props.largeModal !== undefined) dto.largeModal = props.largeModal;
  if (props.selected !== undefined) dto.selected = props.selected;
  if (props.tag !== undefined) dto.tag = props.tag;
  if (props.kind !== undefined) dto.kind = props.kind;
  return isWorkerBoxDTO(dto) ? dto : null;
}

export function rehydrateWorkerBox(dto: WorkerBoxDTO): Box {
  const props = {
    name: dto.name,
    plaintextOutput: dto.plaintextOutput,
    options: dto.options,
    sourceInput: dto.sourceInput,
    onClick: () => {},
    priority: dto.priority,
    showExpandButton: dto.showExpandButton,
    disabled: dto.disabled,
    largeModal: dto.largeModal,
    selected: dto.selected,
    tag: dto.tag,
    kind: dto.kind,
  };
  return { props, view: dto.view };
}

export function createWorkerErrorBox(
  name: string,
  message: string,
  sourceInput?: string,
): WorkerBoxDTO {
  return {
    name,
    plaintextOutput: message,
    options: null,
    sourceInput,
    showExpandButton: false,
  };
}
