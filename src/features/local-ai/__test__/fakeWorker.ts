import { act } from '@testing-library/react';

import type { WorkerPort } from '../client';
import type { AICommand, AIEvent } from '../types';

// `Omit` over a discriminated union collapses to the shared keys, so distribute
// it to keep each variant's payload.
type WorkerEventBody<T> = T extends { id: number } ? Omit<T, 'id'> : never;

// A deterministic stand-in for the module worker, shared by the panel and the
// settings-page tests so both drive the client through the same protocol.
// No test ever downloads a model or runs real GPU inference.
export class FakeWorker implements WorkerPort {
  commands: AICommand[] = [];
  terminated = false;
  onmessage: ((event: MessageEvent<AIEvent>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessageerror: (() => void) | null = null;

  postMessage(command: AICommand): void {
    this.commands.push(command);
  }

  terminate(): void {
    this.terminated = true;
  }

  // Worker messages arrive outside React's event system, so the store update
  // has to be flushed explicitly the way the real message event would be.
  reply(event: WorkerEventBody<AIEvent>): void {
    const id = this.commands.at(-1)?.id ?? -1;
    act(() => {
      this.onmessage?.({ data: { ...event, id } } as MessageEvent<AIEvent>);
    });
  }

  generates(): AICommand[] {
    return this.commands.filter((command) => command.type === 'generate');
  }
}
