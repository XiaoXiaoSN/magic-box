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

// option values that carry secret material must not leak into shareable URLs
// (browser history, referrer headers, chat logs). redact them before sharing.
const SECRET_OPTION_PATTERNS = [/(::jwtsign=)\S+/gi];

const redactSecrets = (input: string): string =>
  SECRET_OPTION_PATTERNS.reduce((acc, re) => acc.replace(re, '$1***'), input);

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
