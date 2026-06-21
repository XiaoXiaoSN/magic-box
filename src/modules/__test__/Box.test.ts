import { describe, expect, it } from 'vitest';
import { errorBox, keyValueBox } from '../Box';

// a stand-in template; keyValueBox only stores it on the box, never invokes it
const FakeTemplate = (() => null) as never;

describe('keyValueBox', () => {
  it('renders the pairs as k: v lines in plaintextOutput', () => {
    const box = keyValueBox(FakeTemplate, 'Demo', { A: '1', B: '2' });
    expect(box.props.plaintextOutput).toBe('A: 1\nB: 2');
  });

  it('stores the same pairs as structured options', () => {
    const box = keyValueBox(FakeTemplate, 'Demo', { A: '1', B: '2' });
    expect(box.props.options).toEqual({ A: '1', B: '2' });
  });

  it('never produces an empty plaintextOutput for non-empty kv (the TUI bug)', () => {
    const box = keyValueBox(FakeTemplate, 'Demo', { Only: 'x' });
    expect(box.props.plaintextOutput).not.toBe('');
    expect(box.props.plaintextOutput).toBe('Only: x');
  });

  it('attaches the given template and applies priority/showExpandButton', () => {
    const box = keyValueBox(
      FakeTemplate,
      'Demo',
      { A: '1' },
      {
        priority: 7,
        showExpandButton: false,
      },
    );
    expect(box.boxTemplate).toBe(FakeTemplate);
    expect(box.props.priority).toBe(7);
    expect(box.props.showExpandButton).toBe(false);
  });

  it('handles an empty kv as an empty string (no entries)', () => {
    const box = keyValueBox(FakeTemplate, 'Demo', {});
    expect(box.props.plaintextOutput).toBe('');
  });
});

describe('errorBox', () => {
  it('renders the message as plaintextOutput and sets no template', () => {
    const box = errorBox('Demo', 'something went wrong');
    expect(box.props.plaintextOutput).toBe('something went wrong');
    // no template → the web layer falls back to DefaultBoxTemplate; the
    // headless layer renders plaintextOutput (never a blank KeyValue grid)
    expect(box.boxTemplate).toBeUndefined();
  });

  it('hides the expand button and applies priority', () => {
    const box = errorBox('Demo', 'oops', { priority: 3 });
    expect(box.props.showExpandButton).toBe(false);
    expect(box.props.priority).toBe(3);
  });
});
