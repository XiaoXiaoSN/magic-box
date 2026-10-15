import { describe, expect, it, vi } from 'vitest';

import { createProgressReporter } from '../progress';

describe('createProgressReporter', () => {
  it('sends integer changes, a bounded heartbeat, and a final update', () => {
    let now = 0;
    const send = vi.fn();
    const reporter = createProgressReporter(send, () => now);

    reporter.report(12.1);
    reporter.report(12.9);
    now = 249;
    reporter.report(12.5);
    now = 250;
    reporter.report(12.8);
    reporter.report(13.4);
    reporter.report(13.4, true);

    expect(send.mock.calls).toEqual([[12], [12], [13], [13]]);
  });

  it('keeps indeterminate file progress alive without flooding unchanged state', () => {
    let now = 0;
    const send = vi.fn();
    const reporter = createProgressReporter(send, () => now);

    reporter.report(null);
    now = 100;
    reporter.report(null);
    now = 250;
    reporter.report(null);
    reporter.report(100, true);

    expect(send.mock.calls).toEqual([[null], [null], [100]]);
    expect(reporter.hasAggregate).toBe(true);
  });
});
