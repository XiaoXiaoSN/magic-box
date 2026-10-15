import { describe, expect, it } from 'vitest';
import type { BoxTemplate } from '../Box';
import {
  errorBox,
  extractOptionKeys,
  hasOptionKeys,
  keyValueBox,
} from '../Box';

// a stand-in template; keyValueBox only stores it on the box, never invokes it
const FakeTemplate = (() => null) as unknown as BoxTemplate;

describe('option helpers', () => {
  it('only matches own properties, including prototype-like names', () => {
    const options = Object.create({ constructor: true }) as Record<
      string,
      string | boolean
    >;
    options.tostring = 'value';

    expect(hasOptionKeys(options, 'constructor')).toBe(false);
    expect(hasOptionKeys(options, 'toString')).toBe(true);
    expect(extractOptionKeys(options, 'constructor', 'toString')).toBe('value');
  });
});

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

  it('attaches the given template and applies showExpandButton', () => {
    const box = keyValueBox(
      FakeTemplate,
      'Demo',
      { A: '1' },
      {
        showExpandButton: false,
      },
    );
    expect(box.boxTemplate).toBe(FakeTemplate);
    expect(box.props.showExpandButton).toBe(false);
  });

  it('handles an empty kv as an empty string (no entries)', () => {
    const box = keyValueBox(FakeTemplate, 'Demo', {});
    expect(box.props.plaintextOutput).toBe('');
  });

  it('defaults showExpandButton to true when not provided', () => {
    const box = keyValueBox(FakeTemplate, 'Demo', { A: '1' });
    expect(box.props.showExpandButton).toBe(true);
  });

  it('passes through an undefined template (web fallback)', () => {
    const box = keyValueBox(undefined, 'Demo', { A: '1' });
    expect(box.boxTemplate).toBeUndefined();
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

  it('hides the expand button', () => {
    const box = errorBox('Demo', 'oops');
    expect(box.props.showExpandButton).toBe(false);
  });
});
