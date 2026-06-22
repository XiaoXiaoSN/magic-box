export interface ShareLinkParams {
  box?: string;
  input?: string;
  pathname: string;
}

const setParamIfPresent = (
  params: URLSearchParams,
  key: string,
  value: string | undefined,
) => {
  if (value) {
    params.set(key, value);
  } else {
    params.delete(key);
  }
};

// option keys whose values are secrets and must never appear in a shareable
// URL (which lands in browser history and server logs). the value is replaced
// with a placeholder while the option itself is preserved so the link still
// demonstrates the tool.
const SECRET_OPTION_PATTERNS: RegExp[] = [
  /(::pbkdf2=)\S+/gi,
  /(::hmac(?:sha256)?=)\S+/gi,
  /(::jwtsign=)\S+/gi,
];

const redactSecrets = (input: string): string =>
  SECRET_OPTION_PATTERNS.reduce(
    (acc, pattern) => acc.replace(pattern, '$1<redacted>'),
    input,
  );

export const buildShareLink = ({
  box,
  input,
  pathname,
  origin = window.location.origin,
}: ShareLinkParams & { origin?: string }): string => {
  const url = new URL(pathname, origin);
  setParamIfPresent(url.searchParams, 'box', box);
  setParamIfPresent(
    url.searchParams,
    'input',
    input ? redactSecrets(input) : input,
  );
  return url.toString();
};
