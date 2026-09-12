import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LocaleProvider } from '../../../contexts/LocaleContext';
import type { WorkerPort } from '../client';
import LocalAIPanel from '../LocalAIPanel';
import type { AICommand, AIEvent } from '../types';

// `Omit` over a discriminated union collapses to the shared keys, so distribute
// it to keep each variant's payload.
type WorkerEventBody<T> = T extends { id: number } ? Omit<T, 'id'> : never;

class FakeWorker implements WorkerPort {
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
}

const setup = (onOutput?: (text: string) => void) => {
  const workers: FakeWorker[] = [];
  render(
    <LocaleProvider>
      <LocalAIPanel
        createWorker={() => {
          const worker = new FakeWorker();
          workers.push(worker);
          return worker;
        }}
        onOutput={onOutput}
      />
    </LocaleProvider>,
  );
  return workers;
};

// Drives the panel to a loaded model the way a user has to: inspect, consent,
// then load. Each step is asserted so a regression in the gating is caught here.
const loadModel = (workers: FakeWorker[]) => {
  fireEvent.click(screen.getByTestId('local-ai-inspect'));
  workers[0].reply({
    type: 'available',
    info: { bytes: 483 * 1024 * 1024, cached: false },
  });
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByTestId('local-ai-prepare'));
  workers[0].reply({ type: 'ready' });
};

describe('LocalAIPanel', () => {
  it('spawns no worker and offers nothing to run before the user asks', () => {
    const workers = setup();
    expect(workers).toHaveLength(0);
    expect(screen.getByTestId('local-ai-status')).toHaveTextContent(
      'Not loaded',
    );
    expect(screen.getByTestId('local-ai-run')).toBeDisabled();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('reports the measured download size and gates loading behind consent', () => {
    const workers = setup();
    fireEvent.click(screen.getByTestId('local-ai-inspect'));
    expect(workers[0].commands).toEqual([{ type: 'inspect', id: 1 }]);
    workers[0].reply({
      type: 'available',
      info: { bytes: 483 * 1024 * 1024, cached: false },
    });
    expect(screen.getByTestId('local-ai-size')).toHaveTextContent('483 MiB');
    // Consent is required, and no weights were requested by the check itself.
    expect(screen.getByTestId('local-ai-prepare')).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByTestId('local-ai-prepare')).toBeEnabled();
    expect(workers[0].commands).toHaveLength(1);
  });

  it('requires a loaded model and non-empty text before generating', () => {
    const workers = setup();
    fireEvent.change(screen.getByTestId('local-ai-input'), {
      target: { value: 'hello' },
    });
    expect(screen.getByTestId('local-ai-run')).toBeDisabled();
    loadModel(workers);
    expect(screen.getByTestId('local-ai-status')).toHaveTextContent(
      'Model ready',
    );
    expect(screen.getByTestId('local-ai-run')).toBeEnabled();
    fireEvent.change(screen.getByTestId('local-ai-input'), {
      target: { value: '   ' },
    });
    expect(screen.getByTestId('local-ai-run')).toBeDisabled();
  });

  it('streams tokens and publishes the settled answer exactly once', () => {
    const onOutput = vi.fn();
    const workers = setup(onOutput);
    loadModel(workers);
    fireEvent.change(screen.getByTestId('local-ai-input'), {
      target: { value: 'Summarize this' },
    });
    fireEvent.click(screen.getByTestId('local-ai-run'));
    const command = workers[0].commands.at(-1);
    expect(command?.type === 'generate' && command.request.input).toBe(
      'Summarize this',
    );
    workers[0].reply({ type: 'delta', text: 'Par' });
    workers[0].reply({ type: 'delta', text: 'tial' });
    expect(screen.getByTestId('local-ai-output')).toHaveTextContent('Partial');
    // Streaming must not publish to the host on every token.
    expect(onOutput).not.toHaveBeenCalled();
    workers[0].reply({ type: 'complete' });
    expect(onOutput).toHaveBeenCalledTimes(1);
    expect(onOutput).toHaveBeenCalledWith('Partial');
  });

  it('shows a sanitized, actionable message for a worker error code', () => {
    const workers = setup();
    fireEvent.click(screen.getByTestId('local-ai-inspect'));
    workers[0].reply({ type: 'error', code: 'unsupported' });
    expect(screen.getByTestId('local-ai-error')).toHaveTextContent(
      'shader-f16',
    );
    expect(workers[0].terminated).toBe(true);
  });

  it('rejects over-long input locally instead of sending it to the worker', () => {
    const workers = setup();
    loadModel(workers);
    const sent = workers[0].commands.length;
    fireEvent.change(screen.getByTestId('local-ai-input'), {
      target: { value: 'x'.repeat(6001) },
    });
    expect(screen.getByTestId('local-ai-run')).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('1,024-token');
    expect(workers[0].commands).toHaveLength(sent);
  });

  it('can stop a download and keeps the stop button inert when idle', () => {
    const workers = setup();
    expect(screen.getByTestId('local-ai-stop')).toBeDisabled();
    fireEvent.click(screen.getByTestId('local-ai-inspect'));
    workers[0].reply({ type: 'available', info: { bytes: 100, cached: true } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByTestId('local-ai-prepare'));
    fireEvent.click(screen.getByTestId('local-ai-stop'));
    expect(workers[0].terminated).toBe(true);
    expect(screen.getByTestId('local-ai-status')).toHaveTextContent('Stopped');
  });
});
