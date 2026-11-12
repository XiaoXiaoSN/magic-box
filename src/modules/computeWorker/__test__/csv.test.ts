import { parseInput } from '@functions/parseOptions';
import { CsvBoxSource } from '@modules/boxSources/CsvBoxSource';
import { describe, expect, it } from 'vitest';

import { type ComputeWorkerEvent, isComputeWorkerEvent } from '../dto';
import { executeComputeWorkerRun } from '../entry';

async function run(raw: string) {
  const [input, options] = parseInput(raw);
  const events: ComputeWorkerEvent[] = [];
  await executeComputeWorkerRun(
    {
      type: 'run',
      runId: 'csv-review',
      input,
      options,
      sourceIds: ['csv'],
      now: 1_704_067_200_000,
      locale: 'en-US',
      timezone: 'UTC',
      timezoneOffset: 0,
      timezoneMode: 'fixed',
    },
    () => CsvBoxSource,
    { postMessage: (event) => events.push(event) },
  );
  expect(events.every(isComputeWorkerEvent)).toBe(true);
  expect(events.some((event) => event.type === 'source-error')).toBe(false);
  const result = events.find((event) => event.type === 'source-result');
  if (result?.type !== 'source-result')
    throw new Error('Missing source result');
  return result.boxes;
}

describe('CSV worker output limits', () => {
  it('returns a format-specific error for Markdown above 1 Mi characters', async () => {
    const boxes = await run(`${'a,b\n'.repeat(260_000)}::md`);
    expect(boxes).toHaveLength(1);
    expect(boxes[0].isError).toBe(true);
    expect(boxes[0].name).toBe('CSV Table → Markdown');
    expect(boxes[0].plaintextOutput).toMatch(/Markdown.*too large/);
  });

  it('transfers a smaller Markdown result', async () => {
    const boxes = await run(`${'a,b\n'.repeat(20_000)}::md`);
    expect(boxes).toHaveLength(1);
    expect(boxes[0].isError).not.toBe(true);
    expect(boxes[0].plaintextOutput).toContain('| a   | b   |');
  });

  it('retains the compliant output when another format exceeds its budget', async () => {
    const boxes = await run(`${'a,b\n'.repeat(80_000)}::csv\n::md`);
    expect(boxes).toHaveLength(2);
    expect(boxes[0].name).toBe('CSV');
    expect(boxes[0].isError).not.toBe(true);
    expect(boxes[1].name).toBe('CSV Table → Markdown');
    expect(boxes[1].isError).toBe(true);
  });

  it('preserves quoted directive data through transport', async () => {
    const boxes = await run('id,note\n1,"before\n::md\nafter"\n::json');
    expect(boxes).toHaveLength(1);
    expect(JSON.parse(boxes[0].plaintextOutput)).toEqual([
      { id: '1', note: 'before\n::md\nafter' },
    ]);
  });
});
