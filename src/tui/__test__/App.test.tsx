import { render } from 'ink-testing-library';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';

import { ResultList } from '../App';
import { runBoxes } from '../runBoxes';

// render smoke test: confirms the ink layer paints a box's name and plaintext
// output to the (virtual) terminal frame.
describe('<ResultList />', () => {
  it('renders box name and plaintext output', async () => {
    const boxes = await runBoxes('uuid');
    const { lastFrame } = render(createElement(ResultList, { boxes }));
    const frame = lastFrame() ?? '';
    expect(frame).toContain('UUID');
    expect(frame).toContain(boxes[0].props.plaintextOutput);
  });

  it('renders a placeholder when there are no boxes', () => {
    const { lastFrame } = render(createElement(ResultList, { boxes: [] }));
    expect(lastFrame()).toContain('no matching boxes');
  });
});
