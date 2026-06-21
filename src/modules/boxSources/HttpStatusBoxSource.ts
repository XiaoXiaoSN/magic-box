import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// standard IANA HTTP status codes with official reason phrases and one-line descriptions.
const STATUS: Record<number, { name: string; description: string }> = {
  // 1xx Informational
  100: {
    name: 'Continue',
    description:
      'The server has received the request headers; client should proceed.',
  },
  101: {
    name: 'Switching Protocols',
    description: 'The server agrees to switch protocols as requested.',
  },
  102: {
    name: 'Processing',
    description:
      'The server has received and is processing the request, no response yet.',
  },
  103: {
    name: 'Early Hints',
    description:
      'Used to return some response headers before the final HTTP message.',
  },

  // 2xx Success
  200: { name: 'OK', description: 'The request succeeded.' },
  201: {
    name: 'Created',
    description: 'The request succeeded and a new resource was created.',
  },
  202: {
    name: 'Accepted',
    description:
      'The request was accepted for processing, but processing is not complete.',
  },
  203: {
    name: 'Non-Authoritative Information',
    description:
      'The returned metadata is from a local or third-party copy, not the origin server.',
  },
  204: {
    name: 'No Content',
    description: 'The request succeeded but there is no content to return.',
  },
  205: {
    name: 'Reset Content',
    description:
      'The request succeeded; the client should reset the document view.',
  },
  206: {
    name: 'Partial Content',
    description:
      'The server is delivering only part of the resource due to a range header.',
  },
  207: {
    name: 'Multi-Status',
    description:
      'The response body contains multiple separate response codes (WebDAV).',
  },
  208: {
    name: 'Already Reported',
    description: 'The members of a DAV binding have already been enumerated.',
  },
  226: {
    name: 'IM Used',
    description:
      'The server fulfilled a GET request using instance manipulations.',
  },

  // 3xx Redirection
  300: {
    name: 'Multiple Choices',
    description:
      'The request has more than one possible response; the user should choose one.',
  },
  301: {
    name: 'Moved Permanently',
    description:
      'The requested resource has been permanently moved to a new URL.',
  },
  302: {
    name: 'Found',
    description: 'The requested resource is temporarily at a different URL.',
  },
  303: {
    name: 'See Other',
    description:
      'The response to the request can be found at a different URL using GET.',
  },
  304: {
    name: 'Not Modified',
    description:
      'The resource has not been modified since the last request; use the cached version.',
  },
  305: {
    name: 'Use Proxy',
    description:
      'The requested resource must be accessed through the specified proxy.',
  },
  307: {
    name: 'Temporary Redirect',
    description:
      'The resource is temporarily at a different URL; method and body must not change.',
  },
  308: {
    name: 'Permanent Redirect',
    description:
      'The resource is permanently at a different URL; method and body must not change.',
  },

  // 4xx Client Error
  400: {
    name: 'Bad Request',
    description: 'The server cannot process the request due to a client error.',
  },
  401: {
    name: 'Unauthorized',
    description:
      'Authentication is required and has failed or not been provided.',
  },
  402: {
    name: 'Payment Required',
    description:
      'Reserved for future use; sometimes used for digital payment requirements.',
  },
  403: {
    name: 'Forbidden',
    description:
      'The server understood the request but refuses to authorize it.',
  },
  404: {
    name: 'Not Found',
    description: 'The server cannot find the requested resource.',
  },
  405: {
    name: 'Method Not Allowed',
    description: 'The HTTP method is not allowed for the requested resource.',
  },
  406: {
    name: 'Not Acceptable',
    description:
      'The resource does not match the acceptable content types in the request.',
  },
  407: {
    name: 'Proxy Authentication Required',
    description:
      'Authentication with the proxy is required before the request can be served.',
  },
  408: {
    name: 'Request Timeout',
    description: 'The server timed out waiting for the request.',
  },
  409: {
    name: 'Conflict',
    description:
      'The request conflicts with the current state of the resource.',
  },
  410: {
    name: 'Gone',
    description:
      'The resource is permanently deleted and will not be available again.',
  },
  411: {
    name: 'Length Required',
    description: 'The request did not include a Content-Length header.',
  },
  412: {
    name: 'Precondition Failed',
    description:
      'The server does not meet one of the preconditions set by the client.',
  },
  413: {
    name: 'Content Too Large',
    description:
      'The request body is larger than the server is willing to process.',
  },
  414: {
    name: 'URI Too Long',
    description:
      'The URI requested by the client is longer than the server will interpret.',
  },
  415: {
    name: 'Unsupported Media Type',
    description:
      'The media format of the request is not supported by the server.',
  },
  416: {
    name: 'Range Not Satisfiable',
    description: 'The range specified in the Range header cannot be fulfilled.',
  },
  417: {
    name: 'Expectation Failed',
    description:
      'The server cannot meet the requirements of the Expect request header.',
  },
  418: {
    name: "I'm a Teapot",
    description:
      'The server refuses to brew coffee because it is a teapot (RFC 2324).',
  },
  421: {
    name: 'Misdirected Request',
    description:
      'The request was directed at a server unable to produce a response.',
  },
  422: {
    name: 'Unprocessable Content',
    description: 'The request was well-formed but contains semantic errors.',
  },
  423: {
    name: 'Locked',
    description: 'The resource being accessed is locked (WebDAV).',
  },
  424: {
    name: 'Failed Dependency',
    description:
      'The request failed because it depended on another request that failed.',
  },
  425: {
    name: 'Too Early',
    description:
      'The server is unwilling to process a request that might be replayed.',
  },
  426: {
    name: 'Upgrade Required',
    description: 'The client should switch to a different protocol.',
  },
  428: {
    name: 'Precondition Required',
    description: 'The origin server requires the request to be conditional.',
  },
  429: {
    name: 'Too Many Requests',
    description:
      'The client has sent too many requests in a given amount of time.',
  },
  431: {
    name: 'Request Header Fields Too Large',
    description:
      'The server is unwilling to process the request because header fields are too large.',
  },
  451: {
    name: 'Unavailable For Legal Reasons',
    description:
      'The server is denying access to the resource as a consequence of a legal demand.',
  },

  // 5xx Server Error
  500: {
    name: 'Internal Server Error',
    description:
      'The server encountered an unexpected condition that prevented it from fulfilling the request.',
  },
  501: {
    name: 'Not Implemented',
    description:
      'The server does not support the functionality required to fulfill the request.',
  },
  502: {
    name: 'Bad Gateway',
    description:
      'The server received an invalid response from an upstream server.',
  },
  503: {
    name: 'Service Unavailable',
    description:
      'The server is not ready to handle the request, usually due to maintenance or overload.',
  },
  504: {
    name: 'Gateway Timeout',
    description:
      'The server did not receive a timely response from an upstream server.',
  },
  505: {
    name: 'HTTP Version Not Supported',
    description:
      'The server does not support the HTTP version used in the request.',
  },
  506: {
    name: 'Variant Also Negotiates',
    description:
      'The server has a configuration error in transparent content negotiation.',
  },
  507: {
    name: 'Insufficient Storage',
    description:
      'The server cannot store the representation needed to complete the request.',
  },
  508: {
    name: 'Loop Detected',
    description:
      'The server detected an infinite loop while processing the request (WebDAV).',
  },
  510: {
    name: 'Not Extended',
    description:
      'Further extensions to the request are required for the server to fulfill it.',
  },
  511: {
    name: 'Network Authentication Required',
    description: 'The client needs to authenticate to gain network access.',
  },
};

// maps the first digit of an HTTP status code to its category name.
const CATEGORIES: Record<number, string> = {
  1: 'Informational',
  2: 'Success',
  3: 'Redirection',
  4: 'Client Error',
  5: 'Server Error',
};

const VALID_CODE_RE = /^[1-5]\d{2}$/;

export const HttpStatusBoxSource = {
  name: 'HTTP Status',
  description: 'Look up an HTTP status code (name, category, description).',
  defaultInput: '404 ::httpstatus',
  tag: '#',
  kind: 'Analyze',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'httpstatus', 'httpcode')) return [];

    // prefer an explicit numeric option value; fall back to parsing the input string.
    const optionValue = extractOptionKeys(options, 'httpstatus', 'httpcode');
    const rawCode =
      typeof optionValue === 'string' && optionValue.trim() !== ''
        ? optionValue.trim()
        : trim(input);

    if (!VALID_CODE_RE.test(rawCode)) {
      const plaintextOutput = `Code: ${rawCode}\nInfo: A valid HTTP status code must be a 3-digit number between 100 and 599.`;
      const kvOptions: Record<string, string> = {
        Code: rawCode,
        Info: 'A valid HTTP status code must be a 3-digit number between 100 and 599.',
      };
      return [
        new BoxBuilder('HTTP Status', plaintextOutput)
          .setTemplate(KeyValueBoxTemplate)
          .setOptions(kvOptions)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const code = Number.parseInt(rawCode, 10);
    const entry = STATUS[code] ?? null;
    const category = CATEGORIES[Math.floor(code / 100)] ?? 'Unknown';
    const name = entry?.name ?? 'Unassigned/Unknown';
    const description = entry?.description ?? '';

    const kvOptions: Record<string, string> = {
      Code: rawCode,
      Name: name,
      Category: category,
      ...(description !== '' ? { Description: description } : {}),
    };

    // k: v plaintext format for the headless TUI consumer.
    const lines = Object.entries(kvOptions)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    return [
      new BoxBuilder('HTTP Status', lines)
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(kvOptions)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default HttpStatusBoxSource;
