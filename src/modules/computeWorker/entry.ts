import { setRuntimePrefs } from '@functions/runtimePrefs';
import type { Box, BoxOptions } from '@modules/Box';
import type { BoxSourceContext } from '@modules/BoxSource';

import {
  type ComputeWorkerEvent,
  type ComputeWorkerRequest,
  type ComputeWorkerRunRequest,
  isComputeWorkerRequest,
  isComputeWorkerRunRequest,
  MAX_WORKER_BOX_COUNT,
  serializeWorkerBoxes,
} from './dto';

export interface ComputeWorkerSource {
  generateBoxes(
    input: string,
    options: BoxOptions,
    context?: BoxSourceContext,
  ): Promise<Box[]>;
}

export type ResolveComputeWorkerSource = (
  sourceId: string,
) => ComputeWorkerSource | null | Promise<ComputeWorkerSource | null>;

export interface ComputeWorkerMessagePort {
  postMessage(message: ComputeWorkerEvent): void;
}

interface ActiveRun {
  runId: string;
  controller: AbortController;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function post(
  port: ComputeWorkerMessagePort,
  message: ComputeWorkerEvent,
): void {
  port.postMessage(message);
}

/** runs worker-safe sources in registry order and isolates source failures. */
export async function executeComputeWorkerRun(
  request: ComputeWorkerRunRequest,
  resolveSource: ResolveComputeWorkerSource,
  port: ComputeWorkerMessagePort,
  isCancelled: () => boolean = () => false,
  signal: AbortSignal = new AbortController().signal,
): Promise<void> {
  post(port, { type: 'started', runId: request.runId });

  for (const sourceId of request.sourceIds) {
    if (isCancelled() || signal.aborted) return;
    post(port, { type: 'source-load-start', runId: request.runId, sourceId });

    let source: ComputeWorkerSource | null;
    try {
      source = await resolveSource(sourceId);
    } catch (error) {
      if (isCancelled() || signal.aborted) return;
      post(port, {
        type: 'source-error',
        runId: request.runId,
        sourceId,
        message: errorMessage(error),
      });
      continue;
    }
    if (source === null) {
      post(port, {
        type: 'source-error',
        runId: request.runId,
        sourceId,
        message: `Worker source "${sourceId}" is unavailable.`,
      });
      continue;
    }

    post(port, { type: 'source-start', runId: request.runId, sourceId });
    try {
      setRuntimePrefs({
        locale: request.locale,
        timezoneOffset: request.timezoneOffset,
        timezoneMode: request.timezoneMode,
      });
      const context = {
        signal,
        preview: false,
        now: request.now,
        locale: request.locale,
        timezone: request.timezone,
        timezoneOffset: request.timezoneOffset,
        timezoneMode: request.timezoneMode,
      };
      const boxes = await source.generateBoxes(
        request.input,
        request.options,
        context,
      );
      if (isCancelled() || signal.aborted) return;
      if (boxes.length > MAX_WORKER_BOX_COUNT) {
        throw new Error(
          `Worker source "${sourceId}" returned too many boxes (limit ${MAX_WORKER_BOX_COUNT}).`,
        );
      }
      const serialized = serializeWorkerBoxes(boxes);
      post(port, {
        type: 'source-result',
        runId: request.runId,
        sourceId,
        boxes: serialized,
      });
    } catch (error) {
      if (isCancelled() || signal.aborted) return;
      post(port, {
        type: 'source-error',
        runId: request.runId,
        sourceId,
        message: errorMessage(error),
      });
    }
  }

  if (!isCancelled() && !signal.aborted) {
    post(port, { type: 'finished', runId: request.runId });
  }
}

/** creates the worker message handler; cancellation aborts the current source. */
export function createComputeWorkerHandler(
  resolveSource: ResolveComputeWorkerSource,
  port: ComputeWorkerMessagePort,
): (request: unknown) => Promise<void> {
  let active: ActiveRun | null = null;

  return async (rawRequest: unknown): Promise<void> => {
    if (!isComputeWorkerRequest(rawRequest)) return;
    const request = rawRequest as ComputeWorkerRequest;
    if (request.type === 'cancel') {
      if (active?.runId === request.runId) {
        active.controller.abort();
        active = null;
      }
      return;
    }

    active?.controller.abort();
    const controller = new AbortController();
    active = { runId: request.runId, controller };
    await executeComputeWorkerRun(
      request,
      resolveSource,
      port,
      () => active?.runId !== request.runId || controller.signal.aborted,
      controller.signal,
    );
    if (active?.runId === request.runId) active = null;
  };
}

export function isWorkerRunRequest(
  value: unknown,
): value is ComputeWorkerRunRequest {
  return isComputeWorkerRunRequest(value);
}
