import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 10_000;

export const UrlParseBoxSource = {
  name: 'URL Parse',
  description:
    'Break a URL into protocol, host, port, path, query and hash components.',
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
    if (input.length > MAX_INPUT) return [];

    const raw = trim(input);

    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      // invalid url — return a descriptive error box
      const box = new BoxBuilder('URL Parse', `Invalid URL: ${raw}`)
        .setTemplate(KeyValueBoxTemplate)
        .setPriority(Priority)
        .build();
      return [box];
    }

    // build key-value pairs; always include Protocol, Host, Path
    const kv: Record<string, string> = {};

    kv.Protocol = url.protocol.replace(/:$/, '');
    if (url.username) kv.Username = url.username;
    if (url.password) kv.Password = url.password;
    kv.Host = url.hostname;
    if (url.port) kv.Port = url.port;
    kv.Path = url.pathname;

    const query = url.search.replace(/^\?/, '');
    if (query) {
      kv.Query = query;
      // decode each param as "key=value" lines
      const params = Array.from(url.searchParams.entries())
        .map(([k, v]) => `${k}=${v}`)
        .join('\n');
      kv.Params = params;
    }

    const hash = url.hash.replace(/^#/, '');
    if (hash) kv.Hash = hash;

    const box = new BoxBuilder('URL Parse', '')
      .setOptions(kv)
      .setTemplate(KeyValueBoxTemplate)
      .setPriority(Priority)
      .build();

    return [box];
  },
};

export default UrlParseBoxSource;
