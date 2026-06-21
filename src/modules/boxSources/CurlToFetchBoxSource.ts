import { CodeBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// flags that consume the next token as their value (skip both flag + value when unknown)
const VALUE_FLAGS = new Set([
  '-u',
  '--user',
  '-A',
  '--user-agent',
  '-o',
  '--output',
  '-m',
  '--max-time',
  '--connect-timeout',
  '--max-redirs',
  '-e',
  '--referer',
  '--cacert',
  '--capath',
  '--cert',
  '--key',
  '-x',
  '--proxy',
  '--proxy-user',
  '-F',
  '--form',
  '--cookie',
  '-b',
  '--cookie-jar',
  '-c',
]);

// tokenize a shell-like string respecting single/double quotes
function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let i = 0;
  const len = input.length;

  while (i < len) {
    const ch = input[i];

    if (ch === "'" || ch === '"') {
      // collect until matching closing quote; honor backslash escapes inside
      // double quotes (e.g. -d "{\"k\":1}")
      const quote = ch;
      i++;
      while (i < len && input[i] !== quote) {
        if (quote === '"' && input[i] === '\\' && i + 1 < len) {
          current += input[i + 1];
          i += 2;
        } else {
          current += input[i];
          i++;
        }
      }
      i++; // skip closing quote
    } else if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      if (current.length > 0) {
        tokens.push(current);
        current = '';
      }
      i++;
    } else {
      current += ch;
      i++;
    }
  }

  if (current.length > 0) {
    tokens.push(current);
  }

  return tokens;
}

interface ParsedCurl {
  url: string | null;
  method: string | null;
  headers: Record<string, string>;
  body: string | null;
}

function parseCurl(raw: string): ParsedCurl {
  const tokens = tokenize(raw);

  let url: string | null = null;
  let method: string | null = null;
  const headers: Record<string, string> = {};
  let body: string | null = null;

  // skip the leading 'curl' token
  let i = tokens[0]?.toLowerCase() === 'curl' ? 1 : 0;

  while (i < tokens.length) {
    const tok = tokens[i];

    if (tok === '-X' || tok === '--request') {
      i++;
      if (i < tokens.length) {
        method = tokens[i].toUpperCase();
      }
    } else if (tok === '-H' || tok === '--header') {
      i++;
      if (i < tokens.length) {
        const colon = tokens[i].indexOf(':');
        if (colon !== -1) {
          const key = tokens[i].slice(0, colon).trim();
          const val = tokens[i].slice(colon + 1).trim();
          headers[key] = val;
        }
      }
    } else if (tok === '-d' || tok === '--data' || tok === '--data-raw') {
      i++;
      if (i < tokens.length) {
        body = tokens[i];
      }
    } else if (VALUE_FLAGS.has(tok)) {
      // skip the value token
      i++;
    } else if (tok.startsWith('-')) {
      // unknown flag, skip just the flag token
    } else {
      // bare token: treat as URL if we haven't found one yet
      if (url === null) {
        url = tok;
      }
    }

    i++;
  }

  return { url, method, headers, body };
}

function buildFetchSnippet(parsed: ParsedCurl): string {
  const { url, method, headers, body } = parsed;

  // resolve the effective method
  let effectiveMethod = method;
  if (effectiveMethod === null) {
    effectiveMethod = body !== null ? 'POST' : 'GET';
  }

  const lines: string[] = [];
  // JSON.stringify every interpolated value so quotes/specials in the curl
  // command can't produce broken JavaScript
  lines.push(`fetch(${JSON.stringify(url)}, {`);

  const optionLines: string[] = [];
  optionLines.push(`  method: ${JSON.stringify(effectiveMethod)}`);

  const headerKeys = Object.keys(headers);
  if (headerKeys.length > 0) {
    const headerLines = headerKeys.map(
      (k) => `    ${JSON.stringify(k)}: ${JSON.stringify(headers[k])}`,
    );
    optionLines.push(`  headers: {\n${headerLines.join(',\n')}\n  }`);
  }

  if (body !== null) {
    optionLines.push(`  body: ${JSON.stringify(body)}`);
  }

  lines.push(optionLines.join(',\n'));
  lines.push('});');

  return lines.join('\n');
}

export const CurlToFetchBoxSource = {
  name: 'curl to fetch',
  description: 'Convert a curl command into a JavaScript fetch() snippet.',
  defaultInput:
    "curl -X POST https://api.example.com -H 'Content-Type: application/json' -d '{\"a\":1}' ::curl2fetch",
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'curl2fetch', 'curltofetch')) return [];
    if (input.length > MAX_INPUT) return [];

    const raw = trim(input);
    const parsed = parseCurl(raw);

    if (parsed.url === null) {
      const errorOutput = 'Error: no URL found in the curl command.';
      return [
        new BoxBuilder('curl to fetch', errorOutput)
          .setTemplate(CodeBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const snippet = buildFetchSnippet(parsed);

    return [
      new BoxBuilder('curl to fetch', snippet)
        .setTemplate(CodeBoxTemplate)
        .setPriority(Priority)
        .build(),
    ];
  },
};

export default CurlToFetchBoxSource;
