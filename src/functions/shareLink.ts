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

export const buildShareLink = ({
  box,
  input,
  pathname,
  origin = window.location.origin,
}: ShareLinkParams & { origin?: string }): string => {
  const url = new URL(pathname, origin);
  setParamIfPresent(url.searchParams, 'box', box);
  setParamIfPresent(url.searchParams, 'input', input);
  return url.toString();
};
