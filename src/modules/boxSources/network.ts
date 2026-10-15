export const NETWORK_TIMEOUT_MS = 8_000;

const abortReason = (signal: AbortSignal): unknown =>
  signal.reason ??
  Object.assign(new Error('The request was aborted'), { name: 'AbortError' });

const BODY_METHODS = new Set([
  'arrayBuffer',
  'blob',
  'bytes',
  'formData',
  'json',
  'text',
]);

const deferBodyCleanup = (response: Response, cleanup: () => void): Response =>
  new Proxy(response, {
    get(target, property) {
      const value = Reflect.get(target, property, target);
      if (
        typeof property !== 'string' ||
        !BODY_METHODS.has(property) ||
        typeof value !== 'function'
      ) {
        return typeof value === 'function' ? value.bind(target) : value;
      }
      return (...args: unknown[]): Promise<unknown> =>
        Promise.resolve(Reflect.apply(value, target, args)).finally(cleanup);
    },
  });

const runWithTimeout = async <T>(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = NETWORK_TIMEOUT_MS,
  consume: (
    response: Response,
    deferCleanup: () => void,
    cleanup: () => void,
  ) => Promise<T>,
): Promise<T> => {
  const controller = new AbortController();
  const forwardAbort = (): void => {
    controller.abort(init.signal?.reason);
  };

  if (init.signal?.aborted) {
    forwardAbort();
  } else {
    init.signal?.addEventListener('abort', forwardAbort, { once: true });
  }

  const timeoutId = setTimeout(() => {
    controller.abort(
      Object.assign(new Error('The request timed out'), {
        name: 'TimeoutError',
      }),
    );
  }, timeoutMs);
  let cleanupDeferred = false;
  const cleanup = (): void => {
    clearTimeout(timeoutId);
    init.signal?.removeEventListener('abort', forwardAbort);
  };

  try {
    const response = await fetch(input, {
      ...init,
      signal: controller.signal,
    });
    return await consume(
      response,
      () => {
        cleanupDeferred = true;
      },
      cleanup,
    );
  } finally {
    if (!cleanupDeferred) cleanup();
  }
};

/** runs a fetch with a local timeout while preserving the caller's signal. */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = NETWORK_TIMEOUT_MS,
): Promise<Response> {
  return runWithTimeout(
    input,
    init,
    timeoutMs,
    async (response, deferCleanup, cleanup) => {
      deferCleanup();
      return deferBodyCleanup(response, cleanup);
    },
  );
}

export interface TimedJsonResponse<T> {
  response: Response;
  payload: T;
}

/** keeps the timeout and caller cancellation active until the JSON body settles. */
export async function fetchJsonWithTimeout<T>(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = NETWORK_TIMEOUT_MS,
): Promise<TimedJsonResponse<T>> {
  return runWithTimeout(input, init, timeoutMs, async (response) => ({
    response,
    payload: (await response.json()) as T,
  }));
}

/** lets a cancelled source stop waiting without cancelling shared work. */
export function withAbort<T>(
  promise: Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(abortReason(signal));

  let removeAbortListener: (() => void) | null = null;
  const aborted = new Promise<never>((_, reject) => {
    const onAbort = (): void => {
      removeAbortListener?.();
      removeAbortListener = null;
      reject(abortReason(signal));
    };
    removeAbortListener = () => signal.removeEventListener('abort', onAbort);
    signal.addEventListener('abort', onAbort, { once: true });
  });

  const cleanup = (): void => {
    removeAbortListener?.();
    removeAbortListener = null;
  };
  void promise.then(cleanup, cleanup);

  return Promise.race([promise, aborted]);
}
