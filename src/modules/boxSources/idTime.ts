export interface FormattedIdTimestamp {
  iso: string;
  unixMs: string;
}

const MAX_DATE_MS = 8_640_000_000_000_000n;

export function formatIdTimestamp(unixMs: bigint): FormattedIdTimestamp | null {
  if (unixMs < -MAX_DATE_MS || unixMs > MAX_DATE_MS) return null;

  const date = new Date(Number(unixMs));
  if (!Number.isFinite(date.getTime())) return null;

  return {
    iso: date.toISOString(),
    unixMs: unixMs.toString(),
  };
}

export function formatIdSeconds(seconds: bigint): FormattedIdTimestamp | null {
  return formatIdTimestamp(seconds * 1000n);
}
