import { BoxBuilder } from '@modules/Box';
import { describe, expect, it } from 'vitest';
import {
  CodeBoxTemplate,
  DefaultBoxTemplate,
  DiffBoxTemplate,
  KeyValueBoxTemplate,
  ShortenURLBoxTemplate,
} from '../index';
import { resolveBoxTemplate } from '../resolveBoxTemplate';

describe('web semantic view resolver', () => {
  it('keeps default/code/key-value web presentation unchanged', () => {
    expect(resolveBoxTemplate(new BoxBuilder('Default', '').build())).toBe(
      DefaultBoxTemplate,
    );
    expect(
      resolveBoxTemplate(new BoxBuilder('Code', '').setView('code').build()),
    ).toBe(CodeBoxTemplate);
    expect(
      resolveBoxTemplate(new BoxBuilder('Diff', '').setView('diff').build()),
    ).toBe(DiffBoxTemplate);
    expect(
      resolveBoxTemplate(
        new BoxBuilder('Pairs', '').setView('keyValue').build(),
      ),
    ).toBe(KeyValueBoxTemplate);
    expect(
      resolveBoxTemplate(
        new BoxBuilder('Shorten URL', '').setView('shortenURL').build(),
      ),
    ).toBe(ShortenURLBoxTemplate);
  });
  it('retains custom template support', () => {
    const custom = () => null;
    expect(
      resolveBoxTemplate(
        new BoxBuilder('Custom', '')
          .setTemplate(custom)
          .setView('code')
          .build(),
      ),
    ).toBe(custom);
  });
});
