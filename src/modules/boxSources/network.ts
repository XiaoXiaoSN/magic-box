export const NETWORK_TIMEOUT_MS = 8_000;

const abortReason = (signal: AbortSignal): unknown =>
  signal.reason ??
  Object.assign(new Error('The request was aborted'), { name: 'AbortError' });

/** runs a fetch with a local timeout while preserving the caller's signal. */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = NETWORK_TIMEOUT_MS,
): Promise<Response> {
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

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
    init.signal?.removeEventListener('abort', forwardAbort);
  }
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
