import { beforeEach, expect, vi } from 'vitest';

vi.mock('math-box', async () => {
  const actual = await vi.importActual<typeof import('math-box')>('math-box');
  return {
    ...actual,
    __actualDefault: actual.default,
    __actualEvaluate: actual.evaluate,
    __actualEvaluateTyped: actual.evaluate_typed,
    default: vi.fn(actual.default),
    evaluate: vi.fn(actual.evaluate),
    evaluate_typed: vi.fn(actual.evaluate_typed),
  };
});

type MockedMathBox = typeof import('math-box') & {
  __actualDefault: typeof mathBox.default;
  __actualEvaluate: typeof mathBox.evaluate;
  __actualEvaluateTyped: typeof mathBox.evaluate_typed;
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
    vi.mocked(mathBox.evaluate_typed)
      .mockReset()
      .mockImplementation(mathBox.__actualEvaluateTyped);
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
    vi.mocked(mathBox.evaluate_typed).mockImplementationOnce(() => {
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
    const evaluateTyped = vi.mocked(mathBox.evaluate_typed);
    evaluateTyped.mockImplementation(() => {
      throw 'invalid expression';
    });

    expect(await source.checkMatch('17 +')).toBeUndefined();
    expect(await source.checkMatch('17 +')).toBeUndefined();
    expect(evaluateTyped).toHaveBeenCalledTimes(1);
  });

  it('copies typed results before freeing the native handle', async () => {
    const free = vi.fn();
    type TypedResultInstance = ReturnType<MockedMathBox['evaluate_typed']>;
    const handle = {
      kind: 'num',
      text: '18',
      exact: false,
      finite: true,
      free,
    } as unknown as TypedResultInstance;
    vi.mocked(mathBox.evaluate_typed).mockReturnValueOnce(handle);

    expect(await source.checkMatch('13 + 5')).toEqual({ answer: '18' });
    expect(free).toHaveBeenCalledTimes(1);
  });

  it('frees a typed result when copying its fields fails', async () => {
    const free = vi.fn();
    type TypedResultInstance = ReturnType<MockedMathBox['evaluate_typed']>;
    const handle = {
      kind: 'num',
      get text(): string {
        throw new Error('injected getter failure');
      },
      exact: false,
      finite: true,
      free,
    } as unknown as TypedResultInstance;
    vi.mocked(mathBox.evaluate_typed).mockReturnValueOnce(handle);
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(await source.checkMatch('13 + 6')).toBeUndefined();
    expect(free).toHaveBeenCalledTimes(1);

    log.mockRestore();
  });
});
