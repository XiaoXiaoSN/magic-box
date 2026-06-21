import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { isString, trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

export const UrlParseBoxSource = {
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
      // invalid url — return a box explaining the failure
      return [
        new BoxBuilder('URL Parse', `Invalid URL: ${raw}`)
          .setTemplate(KeyValueBoxTemplate)
          .setOptions({ Error: `"${raw}" is not a valid URL` })
          .setPriority(Priority)
          .build(),
      ];
    }

    // default ports by scheme so we can fall back when url.port is empty
    const defaultPorts: Record<string, string> = {
      'http:': '80',
      'https:': '443',
      'ftp:': '21',
      'ftps:': '990',
      'ws:': '80',
      'wss:': '443',
    };

    const port = url.port || defaultPorts[url.protocol] || '';

    // build the output record; only include optional fields when non-empty
    const output: Record<string, string> = {
      Protocol: url.protocol.replace(/:$/, ''),
      Host: url.hostname,
      Port: port,
      Path: url.pathname,
    };

    if (url.username) output.Username = decodeURIComponent(url.username);
    if (url.password) output.Password = decodeURIComponent(url.password);

    const query = url.search.replace(/^\?/, '');
    if (query) output.Query = query;

    const hash = url.hash.replace(/^#/, '');
    if (hash) output.Hash = hash;

    // include decoded query params as a convenience key when present
    if (url.searchParams.size > 0) {
      const parts: string[] = [];
      for (const [k, v] of url.searchParams.entries()) {
        parts.push(`${k}=${v}`);
      }
      output.Params = parts.join(', ');
    }

    return [
      new BoxBuilder('URL Parse', raw)
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(output)
        .setPriority(Priority)
        .build(),
    ];
  },
};

export default UrlParseBoxSource;
