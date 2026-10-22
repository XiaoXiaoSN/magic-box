import type { ComputeWorkerEvent } from './dto';
import { createComputeWorkerHandler } from './entry';
import { resolveComputeWorkerSource } from './registry';

const scope = self as unknown as {
  postMessage(message: ComputeWorkerEvent): void;
  onmessage: ((event: MessageEvent<unknown>) => void) | null;
};

const handleMessage = createComputeWorkerHandler(
  resolveComputeWorkerSource,
  scope,
);

scope.onmessage = (event): void => {
  void handleMessage(event.data);
};

scope.postMessage({ type: 'ready' });
