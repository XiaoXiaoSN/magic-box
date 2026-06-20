import { describe, expect, it } from 'vitest';

import { runBoxes } from '../runBoxes';
import { tuiBoxSources } from '../sources';

// proves the headless generation path: the TUI source list runs and produces
// `plaintextOutput` with no react/mui template attached. if any node-safe source
// pulled in a react template, importing this module (and thus `../sources`) would
// drag mui into the node graph; the suite running at all is part of the proof.
describe('headless box generation', () => {
  it('generates a UUID box with no react template attached', async () => {
    const boxes = await runBoxes('uuid');
    expect(boxes).toHaveLength(1);
    expect(boxes[0].props.name).toBe('UUID');
    expect(boxes[0].props.plaintextOutput).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    // headless boxes carry no template; the web layer supplies the default.
    expect(boxes[0].boxTemplate).toBeUndefined();
  });

  it('parses `::option` directives shared with the web parser', async () => {
    const boxes = await runBoxes('uuid\n::uppercase');
    expect(boxes).toHaveLength(1);
    expect(boxes[0].props.plaintextOutput).toBe(
      boxes[0].props.plaintextOutput.toUpperCase(),
    );
  });

  it('converts a unix timestamp into RFC 3339 boxes', async () => {
    const boxes = await runBoxes('1700000000');
    const names = boxes.map((box) => box.props.name);
    expect(names).toContain('RFC 3339');
    expect(boxes.every((box) => box.boxTemplate === undefined)).toBe(true);
  });

  it('returns no boxes for unmatched input', async () => {
    const boxes = await runBoxes('this should match nothing at all zzz');
    expect(boxes).toHaveLength(0);
  });

  it('every TUI source omits a react template (mui-free graph)', async () => {
    for (const source of tuiBoxSources) {
      const boxes = await source.generateBoxes(source.defaultInput, null);
      for (const box of boxes) {
        expect(box.boxTemplate).toBeUndefined();
      }
    }
  });
});
