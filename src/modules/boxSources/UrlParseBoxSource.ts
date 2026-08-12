import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { isString, trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { errorBox, hasOptionKeys, keyValueBox } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

const DEFAULT_PORTS: Readonly<Record<string, string>> = {
  'ftp:': '21',
  'ftps:': '990',
  'http:': '80',
  'https:': '443',
  'ws:': '80',
  'wss:': '443',
};

function decodeUserInfo(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function appendQueryParameters(
  output: Record<string, string>,
  searchParams: URLSearchParams,
): void {
  const valuesByKey = new Map<string, string[]>();

  for (const [key, value] of searchParams) {
    const values = valuesByKey.get(key) ?? [];
    values.push(value);
    valuesByKey.set(key, values);
  }

  for (const [key, values] of valuesByKey) {
    const label = key || '(empty key)';
    output[`Query · ${label}`] = values.join('\n');
  }
}

export const UrlParseBoxSource = {
  defaultDisabled: true,
  name: 'URL Parse',
  description: 'Break a URL into protocol, host, port, path, query, and hash.',
  defaultInput:
    'https://user:pass@example.com:8080/a/b?x=1&y=2#frag ::urlparse',
  tag: '#',
  kind: 'Analyze',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'urlparse', 'parseurl')) return [];
    if (!isString(input) || input.length > MAX_INPUT) return [];

    const raw = trim(input);
    let url: URL;

    try {
      url = new URL(raw);
    } catch {
      return [
        errorBox('URL Parse', `Invalid URL: ${raw}`, {
          priority: this.priority,
        }),
      ];
    }

    const output: Record<string, string> = {
      Protocol: url.protocol.replace(/:$/, ''),
      Host: url.hostname,
      Port: url.port || DEFAULT_PORTS[url.protocol] || '',
      Path: url.pathname,
    };

    if (url.username) output.Username = decodeUserInfo(url.username);
    if (url.password) output.Password = decodeUserInfo(url.password);

    const query = url.search.replace(/^\?/, '');
    if (query) {
      output.Query = query;
      appendQueryParameters(output, url.searchParams);
    }

    const hash = url.hash.replace(/^#/, '');
    if (hash) output.Hash = hash;

    return [
      keyValueBox(KeyValueBoxTemplate, 'URL Parse', output, {
        priority: this.priority,
      }),
    ];
  },
};

export default UrlParseBoxSource;
