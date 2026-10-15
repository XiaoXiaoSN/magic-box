import { beforeEach, expect, vi } from 'vitest';

vi.mock('math-box', async () => {
  const actual = await vi.importActual<typeof import('math-box')>('math-box');
  return {
    ...actual,
    __actualDefault: actual.default,
    __actualEvaluate: actual.evaluate,
    default: vi.fn(actual.default),
    evaluate: vi.fn(actual.evaluate),
  };
});

type MockedMathBox = typeof import('math-box') & {
  __actualDefault: typeof mathBox.default;
  __actualEvaluate: typeof mathBox.evaluate;
};

let mathBox: MockedMathBox;
let source: typeof import('../MathExpressionBoxSource').MathExpressionBoxSource;

describe('MathExpressionBoxSource recovery', () => {
  beforeEach(async () => {
    vi.resetModules();
    mathBox = (await import('math-box')) as MockedMathBox;
    source = (await import('../MathExpressionBoxSource'))
      .MathExpressionBoxSource;
    vi.mocked(mathBox.default)
      .mockReset()
      .mockImplementation(mathBox.__actualDefault);
    vi.mocked(mathBox.evaluate)
      .mockReset()
      .mockImplementation(mathBox.__actualEvaluate);
  });

  it('does not cache a load failure', async () => {
    const load = vi.mocked(mathBox.default);
    load.mockRejectedValueOnce(new Error('temporary WASM load failure'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(await source.checkMatch('13 + 1')).toBeUndefined();
    expect(await source.checkMatch('13 + 1')).toEqual({
      answer: '14',
    });
    expect(load).toHaveBeenCalledTimes(2);

    log.mockRestore();
  });

  it('replaces the glue module after a fatal runtime trap', async () => {
    vi.mocked(mathBox.evaluate).mockImplementationOnce(() => {
      throw new WebAssembly.RuntimeError('injected trap');
    });
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(await source.checkMatch('5 + 6')).toBeUndefined();
    expect(await source.checkMatch('5 + 6')).toEqual({
      answer: '11',
    });
    expect(await source.checkMatch('7 * 6')).toEqual({
      answer: '42',
    });

    log.mockRestore();
  });

  it('caches deterministic evaluator string errors', async () => {
    const evaluate = vi.mocked(mathBox.evaluate);
    evaluate.mockImplementation(() => {
      throw 'invalid expression';
    });

    expect(await source.checkMatch('17 +')).toBeUndefined();
    expect(await source.checkMatch('17 +')).toBeUndefined();
    expect(evaluate).toHaveBeenCalledTimes(1);
  });
});
