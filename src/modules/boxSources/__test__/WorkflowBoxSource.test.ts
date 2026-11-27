import { parseInput } from '@functions/parseOptions';
import { describe, expect, it } from 'vitest';
import WorkflowBoxSource from '../WorkflowBoxSource';

describe('Workflow', () => {
  const recipe = (steps: Record<string, unknown>[]) => ({
    workflow: JSON.stringify({ version: 1, steps }),
  });

  it('replays the default recipe with each intermediate and exact final value', async () => {
    const [input, options] = parseInput(WorkflowBoxSource.defaultInput);
    const boxes = await WorkflowBoxSource.generateBoxes(input, options);
    expect(boxes.map(({ props }) => props.plaintextOutput)).toEqual([
      '{"payload":{"n":42}}',
      '{\n  "n": 42\n}',
      '{\n    "n": 42\n}',
    ]);
  });

  it('stops at a failed step and retains only completed intermediates', async () => {
    const [input] = parseInput(WorkflowBoxSource.defaultInput);
    const boxes = await WorkflowBoxSource.generateBoxes(
      input,
      recipe([
        { tool: 'base64-decode' },
        { tool: 'json-pointer', pointer: '/missing' },
        { tool: 'json-format' },
      ]),
    );
    expect(boxes).toHaveLength(2);
    expect(boxes[0].props.plaintextOutput).toBe('{"payload":{"n":42}}');
    expect(boxes[1].props).toMatchObject({
      name: 'Step 2 · JSON Pointer',
      isError: true,
    });
  });

  it('rejects unsupported tools, oversized input and cancelled runs', async () => {
    const [disallowed] = await WorkflowBoxSource.generateBoxes(
      'data',
      recipe([{ tool: 'shorten-url' }]),
    );
    expect(disallowed.props.isError).toBe(true);
    const supported = recipe([{ tool: 'json-format' }]);
    const [oversized] = await WorkflowBoxSource.generateBoxes(
      'x'.repeat(100_001),
      supported,
    );
    expect(oversized.props.isError).toBe(true);
    await expect(
      WorkflowBoxSource.generateBoxes('1', supported, {
        preview: false,
        signal: AbortSignal.abort(),
      }),
    ).resolves.toEqual([]);
  });
});
