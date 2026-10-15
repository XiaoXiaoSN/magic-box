import { trim } from '@functions/helper';
import { getTimezoneOffset } from '@functions/runtimePrefs';
import { toOffsetISOString } from '@functions/timezone';
import type { Box, BoxOptions } from '@modules/Box';
import {
  BoxBuilder,
  errorBox,
  extractOptionKeys,
  hasOptionKeys,
} from '@modules/Box';

const PriorityJWT = 10;
const MAX_JWT_LENGTH = 16_384;
const MAX_DATE_SECONDS = 8_640_000_000_000;

type JwtHmacHash = 'SHA-256' | 'SHA-384' | 'SHA-512';

interface NumericDateClaim {
  present: boolean;
  valid: boolean;
  value: number | null;
  iso: string | null;
}

interface Match {
  header: Record<string, unknown>;
  body: unknown;
  algorithm: string;
  signingInput: string;
  signature: Uint8Array;
  details: Record<string, string>;
  jwtStr: string;
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function base64UrlValue(character: string): number {
  if (character >= 'A' && character <= 'Z') return character.charCodeAt(0) - 65;
  if (character >= 'a' && character <= 'z') return character.charCodeAt(0) - 71;
  if (character >= '0' && character <= '9') return character.charCodeAt(0) + 4;
  if (character === '-') return 62;
  if (character === '_') return 63;
  return -1;
}

function decodeBase64Url(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(value) || value.length % 4 === 1) return null;

  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const character of value) {
    const digit = base64UrlValue(character);
    if (digit < 0) return null;
    buffer = (buffer << 6) | digit;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  if (bits > 0 && (buffer & ((1 << bits) - 1)) !== 0) return null;
  return Uint8Array.from(bytes);
}

function decodeJson(value: string): unknown | null {
  const bytes = decodeBase64Url(value);
  if (bytes === null) return null;
  try {
    const json = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return JSON.parse(json) as unknown;
  } catch {
    return null;
  }
}

function formatClaimDate(value: number): string | null {
  if (!Number.isFinite(value) || Math.abs(value) > MAX_DATE_SECONDS)
    return null;
  const date = new Date(value * 1000);
  if (!Number.isFinite(date.getTime())) return null;
  try {
    return toOffsetISOString(date, getTimezoneOffset(date));
  } catch {
    return null;
  }
}

function readNumericDate(body: unknown, key: string): NumericDateClaim {
  if (!isJsonObject(body) || !Object.hasOwn(body, key)) {
    return { present: false, valid: false, value: null, iso: null };
  }
  const value = body[key];
  if (typeof value !== 'number') {
    return { present: true, valid: false, value: null, iso: null };
  }
  const iso = formatClaimDate(value);
  return {
    present: true,
    valid: iso !== null,
    value: iso === null ? null : value,
    iso,
  };
}

function formatRemaining(seconds: number): string {
  let remaining = Math.max(0, Math.ceil(seconds));
  const days = Math.floor(remaining / 86_400);
  remaining %= 86_400;
  const hours = Math.floor(remaining / 3_600);
  remaining %= 3_600;
  const minutes = Math.floor(remaining / 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (parts.length === 0 || remaining % 60 > 0)
    parts.push(`${remaining % 60}s`);
  return parts.join(' ');
}

function buildDetails(
  body: unknown,
  signature: string,
): Record<string, string> {
  const exp = readNumericDate(body, 'exp');
  const iat = readNumericDate(body, 'iat');
  const nbf = readNumericDate(body, 'nbf');
  const details: Record<string, string> = { Signature: signature };
  if (exp.present) details.Expiration = exp.iso ?? 'Invalid NumericDate';
  if (iat.present) details['Issued At'] = iat.iso ?? 'Invalid NumericDate';
  if (nbf.present) details['Not Before'] = nbf.iso ?? 'Invalid NumericDate';

  if (!exp.present && !nbf.present) {
    details.Validity = 'No validity window';
  } else if ((exp.present && !exp.valid) || (nbf.present && !nbf.valid)) {
    details.Validity = 'Invalid NumericDate claim';
  } else {
    const now = Date.now() / 1000;
    if (nbf.value !== null && now < nbf.value) {
      details.Validity = `Not yet valid (starts ${nbf.iso})`;
    } else if (exp.value !== null && now >= exp.value) {
      details.Validity = 'Expired';
    } else if (exp.value !== null) {
      details.Validity = `Valid (remaining ${formatRemaining(exp.value - now)})`;
    } else {
      details.Validity = 'Valid (no expiration)';
    }
  }
  return details;
}

function renderJwt(
  header: Record<string, unknown>,
  body: unknown,
  details: Record<string, string>,
): string {
  return JSON.stringify({ header, body, details }, null, '    ');
}

function parseJwt(input: string): Match | undefined {
  const regularInput = trim(input).replace(/^Bearer\s+/i, '');
  if (regularInput.length > MAX_JWT_LENGTH) return undefined;

  const parts = regularInput.split('.');
  if (parts.length !== 3 || parts.some((part) => part.length === 0)) {
    return undefined;
  }

  const headerValue = decodeJson(parts[0]);
  const body = decodeJson(parts[1]);
  if (!isJsonObject(headerValue) || body === null) return undefined;
  const algorithm = headerValue.alg;
  if (
    typeof algorithm !== 'string' ||
    algorithm.length === 0 ||
    algorithm === 'none'
  ) {
    return undefined;
  }

  const signature = decodeBase64Url(parts[2]);
  if (signature === null || signature.length === 0) return undefined;
  const expectedLength = expectedSignatureLength(algorithm);
  if (expectedLength !== null && signature.length !== expectedLength) {
    return undefined;
  }

  const details = buildDetails(body, 'Unverified (decode only)');
  return {
    header: headerValue,
    body,
    algorithm,
    signingInput: `${parts[0]}.${parts[1]}`,
    signature,
    details,
    jwtStr: renderJwt(headerValue, body, details),
  };
}

function hmacHash(algorithm: string): JwtHmacHash | null {
  if (algorithm === 'HS256') return 'SHA-256';
  if (algorithm === 'HS384') return 'SHA-384';
  if (algorithm === 'HS512') return 'SHA-512';
  return null;
}

function expectedSignatureLength(algorithm: string): number | null {
  if (algorithm === 'HS256') return 32;
  if (algorithm === 'HS384') return 48;
  if (algorithm === 'HS512') return 64;
  return null;
}

async function verifySignature(match: Match, secret: string): Promise<boolean> {
  const hash = hmacHash(match.algorithm);
  if (hash === null) throw new Error('unsupported algorithm');
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('Web Crypto is unavailable');
  }

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret) as BufferSource,
    { name: 'HMAC', hash },
    false,
    ['verify'],
  );
  return crypto.subtle.verify(
    'HMAC',
    key,
    match.signature as BufferSource,
    new TextEncoder().encode(match.signingInput) as BufferSource,
  );
}

export const JWTBoxSource = {
  name: 'JWT Decode',
  description:
    'Decode a JWT, render NumericDate claims in the preferred timezone, and optionally verify HS256/HS384/HS512 with ::secret.',
  defaultInput:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
  tag: '🔑',
  kind: 'Decode',
  priority: PriorityJWT,

  checkMatch(input: string): Match | undefined {
    return parseJwt(input);
  },

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const match = this.checkMatch(input);
    if (match === undefined) return [];

    const hasSecret = hasOptionKeys(options, 'secret');
    const secret = extractOptionKeys(options, 'secret');
    if (hasSecret && (typeof secret !== 'string' || secret.length === 0)) {
      return [
        errorBox('JWT', 'Provide a secret value for signature verification.', {
          priority: this.priority,
        }),
      ];
    }

    let signature = 'Unverified (decode only)';
    if (hasSecret && typeof secret === 'string') {
      if (hmacHash(match.algorithm) === null) {
        return [
          errorBox(
            'JWT',
            'Signature verification supports HS256, HS384, and HS512 only.',
            { priority: this.priority },
          ),
        ];
      }
      try {
        signature = (await verifySignature(match, secret))
          ? 'Valid'
          : 'Invalid';
      } catch {
        return [
          errorBox('JWT', 'Signature verification is unavailable.', {
            priority: this.priority,
          }),
        ];
      }
    }

    const details = buildDetails(match.body, signature);
    const jwtStr = renderJwt(match.header, match.body, details);
    const displayOptions: Record<string, string> = {
      language: 'json',
      ...details,
    };
    return [
      new BoxBuilder('JWT Decode', jwtStr)
        .setOptions(displayOptions)
        .setView('code')
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default JWTBoxSource;
