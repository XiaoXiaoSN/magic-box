import type { Box, BoxOptions } from '@modules/Box';
import { errorBox, hasOptionKeys, keyValueBox } from '@modules/Box';

const BoxName = 'HTTP Status';
const MAX_INPUT_LENGTH = 256;

interface HttpStatusInfo {
  code: number;
  name: string;
  description: string;
  reference: string;
}

// IANA HTTP Status Code Registry snapshot checked on 2026-10-15.
const STATUS_DATA: readonly HttpStatusInfo[] = [
  {
    code: 100,
    name: 'Continue',
    description: 'The client may continue sending the request body.',
    reference: 'RFC 9110 §15.2.1',
  },
  {
    code: 101,
    name: 'Switching Protocols',
    description:
      'The server is switching to the protocol named in the Upgrade request field.',
    reference: 'RFC 9110 §15.2.2',
  },
  {
    code: 102,
    name: 'Processing',
    description:
      'A WebDAV server has received the request but has not completed it.',
    reference: 'RFC 2518',
  },
  {
    code: 103,
    name: 'Early Hints',
    description:
      'The server sends preliminary response fields before the final response.',
    reference: 'RFC 8297',
  },
  {
    code: 104,
    name: 'Upload Resumption Supported',
    description:
      'Temporary registration for the resumable upload extension; expires 2026-11-13.',
    reference: 'draft-ietf-httpbis-resumable-upload-05 (temporary)',
  },
  {
    code: 200,
    name: 'OK',
    description: 'The request succeeded.',
    reference: 'RFC 9110 §15.3.1',
  },
  {
    code: 201,
    name: 'Created',
    description: 'The request succeeded and created one or more resources.',
    reference: 'RFC 9110 §15.3.2',
  },
  {
    code: 202,
    name: 'Accepted',
    description:
      'The request was accepted for processing, which may not be complete yet.',
    reference: 'RFC 9110 §15.3.3',
  },
  {
    code: 203,
    name: 'Non-Authoritative Information',
    description:
      'The request succeeded, but a transforming proxy changed the response metadata or content.',
    reference: 'RFC 9110 §15.3.4',
  },
  {
    code: 204,
    name: 'No Content',
    description: 'The request succeeded and there is no response content.',
    reference: 'RFC 9110 §15.3.5',
  },
  {
    code: 205,
    name: 'Reset Content',
    description:
      'The request succeeded and the user agent should reset the document view.',
    reference: 'RFC 9110 §15.3.6',
  },
  {
    code: 206,
    name: 'Partial Content',
    description:
      'The server is returning the requested range of a representation.',
    reference: 'RFC 9110 §15.3.7',
  },
  {
    code: 207,
    name: 'Multi-Status',
    description:
      'The response reports multiple independent WebDAV resource statuses.',
    reference: 'RFC 4918',
  },
  {
    code: 208,
    name: 'Already Reported',
    description:
      'A WebDAV binding was already reported in an earlier response member.',
    reference: 'RFC 5842',
  },
  {
    code: 226,
    name: 'IM Used',
    description:
      'The response represents the result of an instance manipulation.',
    reference: 'RFC 3229',
  },
  {
    code: 300,
    name: 'Multiple Choices',
    description:
      'The target has multiple representations and the user agent may select one.',
    reference: 'RFC 9110 §15.4.1',
  },
  {
    code: 301,
    name: 'Moved Permanently',
    description:
      'The target has a new permanent URI, usually supplied in Location.',
    reference: 'RFC 9110 §15.4.2',
  },
  {
    code: 302,
    name: 'Found',
    description:
      'The target is temporarily available at another URI, usually supplied in Location.',
    reference: 'RFC 9110 §15.4.3',
  },
  {
    code: 303,
    name: 'See Other',
    description:
      'The response points to another resource that can be retrieved with GET.',
    reference: 'RFC 9110 §15.4.4',
  },
  {
    code: 304,
    name: 'Not Modified',
    description: 'A conditional request can use its stored representation.',
    reference: 'RFC 9110 §15.4.5',
  },
  {
    code: 305,
    name: 'Use Proxy',
    description:
      'Deprecated status code; clients should not use this response.',
    reference: 'RFC 9110 §15.4.6',
  },
  {
    code: 306,
    name: 'Unused',
    description: 'Reserved as unused by RFC 9110.',
    reference: 'RFC 9110 §15.4.7',
  },
  {
    code: 307,
    name: 'Temporary Redirect',
    description:
      'The target is temporarily available at another URI and the method must not change.',
    reference: 'RFC 9110 §15.4.8',
  },
  {
    code: 308,
    name: 'Permanent Redirect',
    description:
      'The target has a new permanent URI and the method must not change.',
    reference: 'RFC 9110 §15.4.9',
  },
  {
    code: 400,
    name: 'Bad Request',
    description:
      'The server cannot or will not process the request because of a client error.',
    reference: 'RFC 9110 §15.5.1',
  },
  {
    code: 401,
    name: 'Unauthorized',
    description: 'The request lacks valid authentication credentials.',
    reference: 'RFC 9110 §15.5.2',
  },
  {
    code: 402,
    name: 'Payment Required',
    description:
      'Reserved for future use; the server may indicate a payment requirement.',
    reference: 'RFC 9110 §15.5.3',
  },
  {
    code: 403,
    name: 'Forbidden',
    description: 'The server understood the request but refuses to fulfill it.',
    reference: 'RFC 9110 §15.5.4',
  },
  {
    code: 404,
    name: 'Not Found',
    description:
      'The server has no current representation for the target or will not disclose one.',
    reference: 'RFC 9110 §15.5.5',
  },
  {
    code: 405,
    name: 'Method Not Allowed',
    description:
      'The method is known but is not supported for the target resource.',
    reference: 'RFC 9110 §15.5.6',
  },
  {
    code: 406,
    name: 'Not Acceptable',
    description:
      'The server has no representation acceptable under the request negotiation fields.',
    reference: 'RFC 9110 §15.5.7',
  },
  {
    code: 407,
    name: 'Proxy Authentication Required',
    description:
      'The client must authenticate with the proxy before this request can proceed.',
    reference: 'RFC 9110 §15.5.8',
  },
  {
    code: 408,
    name: 'Request Timeout',
    description:
      'The server did not receive a complete request within the time it was prepared to wait.',
    reference: 'RFC 9110 §15.5.9',
  },
  {
    code: 409,
    name: 'Conflict',
    description:
      'The request conflicts with the current state of the target resource.',
    reference: 'RFC 9110 §15.5.10',
  },
  {
    code: 410,
    name: 'Gone',
    description:
      'The target is no longer available and this condition is likely permanent.',
    reference: 'RFC 9110 §15.5.11',
  },
  {
    code: 411,
    name: 'Length Required',
    description:
      'The server refuses the request without a valid Content-Length field.',
    reference: 'RFC 9110 §15.5.12',
  },
  {
    code: 412,
    name: 'Precondition Failed',
    description: 'A request condition evaluated to false on the server.',
    reference: 'RFC 9110 §15.5.13',
  },
  {
    code: 413,
    name: 'Content Too Large',
    description:
      'The request content is larger than the server is willing or able to process.',
    reference: 'RFC 9110 §15.5.14',
  },
  {
    code: 414,
    name: 'URI Too Long',
    description:
      'The target URI is longer than the server is willing to interpret.',
    reference: 'RFC 9110 §15.5.15',
  },
  {
    code: 415,
    name: 'Unsupported Media Type',
    description:
      'The server refuses the request because its content format is unsupported.',
    reference: 'RFC 9110 §15.5.16',
  },
  {
    code: 416,
    name: 'Range Not Satisfiable',
    description:
      'The server cannot satisfy the requested range for the target representation.',
    reference: 'RFC 9110 §15.5.17',
  },
  {
    code: 417,
    name: 'Expectation Failed',
    description:
      'The server cannot meet the request Expect field requirements.',
    reference: 'RFC 9110 §15.5.18',
  },
  {
    code: 418,
    name: 'Unused',
    description: 'Reserved as unused by RFC 9110.',
    reference: 'RFC 9110 §15.5.19',
  },
  {
    code: 421,
    name: 'Misdirected Request',
    description:
      'The request was sent to a server that cannot produce a response for this target.',
    reference: 'RFC 9110 §15.5.20',
  },
  {
    code: 422,
    name: 'Unprocessable Content',
    description:
      'The content type and syntax are understood, but the contained instructions cannot be processed.',
    reference: 'RFC 9110 §15.5.21',
  },
  {
    code: 423,
    name: 'Locked',
    description: 'The source or destination resource is locked.',
    reference: 'RFC 4918',
  },
  {
    code: 424,
    name: 'Failed Dependency',
    description:
      'The requested action failed because it depended on another action that failed.',
    reference: 'RFC 4918',
  },
  {
    code: 425,
    name: 'Too Early',
    description:
      'The server is unwilling to risk processing a request that might be replayed.',
    reference: 'RFC 8470',
  },
  {
    code: 426,
    name: 'Upgrade Required',
    description:
      'The server refuses the request until the client switches to another protocol.',
    reference: 'RFC 9110 §15.5.22',
  },
  {
    code: 428,
    name: 'Precondition Required',
    description: 'The origin server requires a conditional request.',
    reference: 'RFC 6585',
  },
  {
    code: 429,
    name: 'Too Many Requests',
    description: 'The client sent too many requests in a given amount of time.',
    reference: 'RFC 6585',
  },
  {
    code: 431,
    name: 'Request Header Fields Too Large',
    description:
      'The server refuses the request because its header fields are too large.',
    reference: 'RFC 6585',
  },
  {
    code: 451,
    name: 'Unavailable For Legal Reasons',
    description:
      'The server cannot provide the resource because of a legal demand.',
    reference: 'RFC 7725',
  },
  {
    code: 500,
    name: 'Internal Server Error',
    description:
      'The server encountered an unexpected condition that prevented it from fulfilling the request.',
    reference: 'RFC 9110 §15.6.1',
  },
  {
    code: 501,
    name: 'Not Implemented',
    description:
      'The server does not support the functionality required to fulfill the request.',
    reference: 'RFC 9110 §15.6.2',
  },
  {
    code: 502,
    name: 'Bad Gateway',
    description:
      'A gateway received an invalid response from an upstream server.',
    reference: 'RFC 9110 §15.6.3',
  },
  {
    code: 503,
    name: 'Service Unavailable',
    description: 'The server is temporarily unable to handle the request.',
    reference: 'RFC 9110 §15.6.4',
  },
  {
    code: 504,
    name: 'Gateway Timeout',
    description:
      'A gateway did not receive a timely response from an upstream server.',
    reference: 'RFC 9110 §15.6.5',
  },
  {
    code: 505,
    name: 'HTTP Version Not Supported',
    description:
      'The server does not support the HTTP major version used in the request.',
    reference: 'RFC 9110 §15.6.6',
  },
  {
    code: 506,
    name: 'Variant Also Negotiates',
    description:
      'A server configuration error caused transparent content negotiation to recurse.',
    reference: 'RFC 2295',
  },
  {
    code: 507,
    name: 'Insufficient Storage',
    description:
      'The server cannot store the representation needed to complete the request.',
    reference: 'RFC 4918',
  },
  {
    code: 508,
    name: 'Loop Detected',
    description:
      'The server detected an infinite loop while processing a WebDAV request.',
    reference: 'RFC 5842',
  },
  {
    code: 510,
    name: 'Not Extended',
    description: 'Obsoleted status code for an extension negotiation failure.',
    reference: 'RFC 2774 (obsoleted)',
  },
  {
    code: 511,
    name: 'Network Authentication Required',
    description: 'The client must authenticate to gain network access.',
    reference: 'RFC 6585',
  },
];

const STATUS_BY_CODE = new Map(
  STATUS_DATA.map((status) => [status.code, status]),
);
const STATUS_BY_NAME = new Map<string, HttpStatusInfo[]>();
for (const status of STATUS_DATA) {
  const key = status.name.toLowerCase().replace(/\s+/g, ' ').trim();
  const matches = STATUS_BY_NAME.get(key) ?? [];
  matches.push(status);
  STATUS_BY_NAME.set(key, matches);
}

const HEURISTICALLY_CACHEABLE = new Set([
  200, 203, 204, 206, 300, 301, 308, 404, 405, 410, 414, 501,
]);

function category(code: number): string {
  const categories: Record<number, string> = {
    1: 'Informational',
    2: 'Success',
    3: 'Redirection',
    4: 'Client Error',
    5: 'Server Error',
  };
  return `${Math.floor(code / 100)}xx ${categories[Math.floor(code / 100)]}`;
}

function retryAdvice(code: number): string {
  if (code === 408)
    return 'A client may repeat a timed-out request on a new connection; only repeat non-idempotent work with an idempotency guarantee.';
  if (code === 425)
    return 'Retry without early data only when the client sent this request as early data and its replay policy allows it.';
  if (code === 429)
    return 'Wait for Retry-After when present; otherwise use bounded backoff, and repeat only safe or idempotent work.';
  if (code === 503)
    return 'The condition may be temporary; honor Retry-After and use bounded backoff for safe or idempotent work.';
  if (code === 500 || code === 502 || code === 504)
    return 'It may be transient, but retry only safe or idempotent work (or use an idempotency key) with bounded backoff.';
  if (code >= 300 && code < 400)
    return 'Apply the redirect or conditional request rules; this is not a generic error retry.';
  return 'No generic retry recommendation; inspect the response and request semantics before trying again.';
}

function statusBox(status: HttpStatusInfo): Box {
  const cache = HEURISTICALLY_CACHEABLE.has(status.code)
    ? 'Heuristically cacheable by default; response headers and method still apply.'
    : 'Not heuristically cacheable by default; explicit freshness can still allow caching.';
  return keyValueBox('keyValue', BoxName, {
    Code: String(status.code),
    Name: status.name,
    Category: category(status.code),
    Description: status.description,
    Reference: status.reference,
    Caching: cache,
    Retry: retryAdvice(status.code),
  });
}

function normalizeQuery(input: string): string {
  return input
    .trim()
    .replace(/^(?:http|status)(?:\s+|:\s*)(?=\d{3}$)/i, '')
    .trim();
}

function lookup(query: string): HttpStatusInfo[] {
  if (/^\d{3}$/.test(query)) {
    const status = STATUS_BY_CODE.get(Number(query));
    return status ? [status] : [];
  }
  return (
    STATUS_BY_NAME.get(query.toLowerCase().replace(/\s+/g, ' ').trim()) ?? []
  );
}

export const HttpStatusBoxSource = {
  defaultDisabled: true,
  name: BoxName,
  description:
    'Look up an IANA-assigned HTTP status by code or exact reason phrase with ::http, http 502, or status 404.',
  defaultInput: '404\n::http',
  tag: 'HTTP',
  kind: 'Decode',

  canHandle(input: string, options: BoxOptions): boolean {
    if (hasOptionKeys(options, 'http')) return true;
    return (
      input.length <= MAX_INPUT_LENGTH &&
      /^(?:http|status)(?:\s+|:\s*)\d{3}$/i.test(input.trim())
    );
  },

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const explicit = hasOptionKeys(options, 'http');
    if (!explicit && !/^(?:http|status)(?:\s+|:\s*)\d{3}$/i.test(input.trim()))
      return [];
    if (input.length > MAX_INPUT_LENGTH) {
      return [
        errorBox(BoxName, 'HTTP Status supports input up to 256 characters.'),
      ];
    }

    const optionValue = options?.http;
    if (
      typeof optionValue === 'string' &&
      optionValue.length > MAX_INPUT_LENGTH
    ) {
      return [
        errorBox(BoxName, 'HTTP Status supports input up to 256 characters.'),
      ];
    }
    const query = normalizeQuery(
      typeof optionValue === 'string' ? optionValue : input,
    );
    if (!query) {
      return [
        errorBox(
          BoxName,
          'Enter a three-digit status code or exact reason phrase.',
        ),
      ];
    }

    const matches = lookup(query);
    if (matches.length === 1) return [statusBox(matches[0])];
    if (matches.length > 1) {
      return [
        errorBox(
          BoxName,
          `"${query}" names more than one registered status (${matches.map((status) => status.code).join(', ')}); enter a code instead.`,
        ),
      ];
    }

    if (/^\d{3}$/.test(query)) {
      return [
        errorBox(
          BoxName,
          `HTTP ${query} is not assigned in the IANA status code registry checked on 2026-10-15.`,
        ),
      ];
    }
    return [
      errorBox(
        BoxName,
        `No exact IANA status phrase matches "${query}". Use a three-digit code or exact registered name.`,
      ),
    ];
  },
};

export default HttpStatusBoxSource;
