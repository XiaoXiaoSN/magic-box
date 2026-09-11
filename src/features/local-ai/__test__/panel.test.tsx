import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { isLocalAIPrivate } from '../../../functions/localAIPrivacy';
import { LocalAIClient, type WorkerPort } from '../client';
import LocalAIPanel from '../LocalAIPanel';
import MagicBoxWithLocalAI from '../MagicBoxWithLocalAI';
import type { Command, WorkerEvent } from '../protocol';

const copy = vi.hoisted(() => vi.fn(async () => true));
vi.mock('../../../contexts/LocaleContext', () => ({ useLocale: () => ({ locale: 'en' }) }));
vi.mock('../../../functions/clipboard', () => ({ default: copy }));
vi.mock('../../../pages/MagicBox/MagicBoxPage', () => ({
  default: () => <div data-testid="tools-panel"><button type="button" data-testid="history-toggle">History</button><button type="button" data-testid="copy-share-link">Share</button></div>,
}));

class FakeWorker implements WorkerPort {
  onmessage: WorkerPort['onmessage'] = null;
  onerror: WorkerPort['onerror'] = null;
  onmessageerror: WorkerPort['onmessageerror'] = null;
  commands: Command[] = [];
  terminated = false;
  postMessage(command: Command) { this.commands.push(command); }
  terminate() { this.terminated = true; }
  emit(event: WorkerEvent) { this.onmessage?.({ data: event } as MessageEvent<WorkerEvent>); }
  get id() { return this.commands[this.commands.length - 1].id; }
}
function setup() {
  const worker = new FakeWorker(); const factory = vi.fn(() => worker);
  const client = new LocalAIClient(factory);
  const view = render(<StrictMode><LocalAIPanel client={client} /></StrictMode>);
  const prepare = () => {
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Download / load model' }));
    act(() => worker.emit({ type: 'ready', id: worker.id }));
  };
  const run = () => {
    fireEvent.change(screen.getByTestId('local-ai-input'), { target: { value: 'private prompt' } });
    fireEvent.click(screen.getByRole('button', { name: 'Run locally' }));
  };
  return { ...view, worker, factory, client, prepare, run };
}

describe('Local AI UI', () => {
  it('requires consent plus a click; mounting and typing do not allocate a Worker', () => {
    const { factory } = setup();
    fireEvent.change(screen.getByTestId('local-ai-input'), { target: { value: 'private' } });
    expect(factory).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Download / load model' })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox'));
    expect(factory).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Download / load model' }));
    expect(factory).toHaveBeenCalledTimes(1);
  });
  it('shows escaped output and copies the final result, not the progress or old stream', async () => {
    copy.mockClear(); const { worker, prepare, run } = setup(); prepare(); run();
    act(() => worker.emit({ type: 'token', id: worker.id, text: 'partial' }));
    expect(screen.getByRole('button', { name: 'Copy' })).toBeDisabled();
    const final = '<img src=x onerror=alert(1)>';
    act(() => worker.emit({ type: 'complete', id: worker.id, text: final }));
    expect(screen.getByTestId('local-ai-output')).toHaveTextContent(final);
    expect(document.querySelector('img')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    await waitFor(() => expect(copy).toHaveBeenLastCalledWith(final));
  });
  it('stops generation, marks partial output and requires reloading', () => {
    const { worker, prepare, run } = setup(); prepare(); run();
    act(() => worker.emit({ type: 'token', id: worker.id, text: 'partial' }));
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(worker.terminated).toBe(true);
    expect(screen.getByTestId('local-ai-output')).toHaveTextContent('partial');
    expect(screen.getByRole('button', { name: 'Run locally' })).toBeDisabled();
    expect(screen.getByText(/Stopped output is incomplete/)).toBeInTheDocument();
  });
  it('reuses output only inside AI input and releases resources on unmount', () => {
    const { worker, prepare, run, unmount, client } = setup(); prepare(); run();
    act(() => worker.emit({ type: 'complete', id: worker.id, text: 'answer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Use as AI input' }));
    expect(screen.getByTestId('local-ai-input')).toHaveValue('answer');
    expect(localStorage.getItem('mb_search_history')).toBeNull();
    unmount(); expect(worker.terminated).toBe(true); expect(client.getSnapshot().text).toBe('');
  });
  it('shows a useful unsupported-device error without a cloud retry', () => {
    const { worker, factory } = setup();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Download / load model' }));
    act(() => worker.emit({ type: 'error', id: worker.id, code: 'unsupported' }));
    expect(screen.getByRole('alert')).toHaveTextContent('WebGPU is unavailable');
    expect(factory).toHaveBeenCalledTimes(1); expect(worker.terminated).toBe(true);
  });
  it('unmounts ordinary tools in AI mode and does not restore private drafts', async () => {
    render(<MagicBoxWithLocalAI />);
    expect(screen.getByTestId('tools-panel')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Local AI' }));
    const input = await screen.findByTestId('local-ai-input');
    expect(screen.queryByTestId('history-toggle')).not.toBeInTheDocument();
    expect(screen.queryByTestId('copy-share-link')).not.toBeInTheDocument();
    fireEvent.change(input, { target: { value: 'do not persist this' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tools' }));
    expect(isLocalAIPrivate()).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Local AI' }));
    expect(await screen.findByTestId('local-ai-input')).toHaveValue('');
    expect(localStorage.getItem('mb_search_history')).toBeNull();
    expect(window.location.search).not.toContain('do not persist this');
  });
});
