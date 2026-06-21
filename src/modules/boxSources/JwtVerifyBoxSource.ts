import {
  DefaultBoxTemplate,
  KeyValueBoxTemplate,
} from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys, hasOptionKeys } from '@modules/Box';

const Priority = 20;
const MAX_INPUT = 100_000;

// converts a base64url string to a regular base64 string, then decodes it
function base64urlDecode(str: string): string {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    '=',
  );
  return atob(padded);
}

// encodes an ArrayBuffer as a base64url string (no padding)
function bufToBase64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// recomputes the HMAC-SHA256 signature over `${header}.${payload}` with the given secret
async function computeHmacSha256(
  message: string,
  secret: string,
): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return bufToBase64url(sig);
}

// builds `k: v` plaintext lines from a record, preserving insertion order
function buildPlaintextLines(data: Record<string, string>): string {
  return Object.entries(data)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

export const JwtVerifyBoxSource = {
  name: 'JWT Verify',
  description:
    'Verify an HS256 JWT signature against a secret and decode the payload. token ::jwtverify=secret',
  defaultInput:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c ::jwtverify=your-256-bit-secret',
  tag: '#',
  kind: 'Validate',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'jwtverify')) return [];
    if (input.length > MAX_INPUT) return [];

    // guard for non-secure contexts where crypto.subtle is unavailable
    if (typeof crypto === 'undefined' || !crypto.subtle) {
      return [
        new BoxBuilder(
          'JWT Verify',
          'JWT verification requires a secure context (HTTPS). crypto.subtle is not available.',
        )
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const secretValue = extractOptionKeys(options, 'jwtverify');
    if (
      !secretValue ||
      secretValue === true ||
      String(secretValue).trim() === ''
    ) {
      return [
        new BoxBuilder(
          'JWT Verify',
          'A secret is required. Usage: <token> ::jwtverify=<secret>',
        )
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      ];
    }
    const secret = String(secretValue);

    const token = trim(input);
    const parts = token.split('.');
    if (parts.length !== 3) {
      return [
        new BoxBuilder(
          'JWT Verify',
          'Malformed token: expected 3 dot-separated parts (header.payload.signature).',
        )
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const [headerB64, payloadB64, signatureB64] = parts;

    // decode and validate header
    let header: Record<string, unknown>;
    try {
      header = JSON.parse(base64urlDecode(headerB64));
    } catch {
      return [
        new BoxBuilder(
          'JWT Verify',
          'Malformed token: could not decode header.',
        )
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      ];
    }

    if (header.alg !== 'HS256') {
      return [
        new BoxBuilder(
          'JWT Verify',
          `Only HS256 is supported. Token uses: ${String(header.alg ?? 'unknown')}`,
        )
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      ];
    }

    // recompute HMAC-SHA256 signature and compare
    const computed = await computeHmacSha256(
      `${headerB64}.${payloadB64}`,
      secret,
    );
    const signatureValid = computed === signatureB64;

    // decode payload
    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(base64urlDecode(payloadB64));
    } catch {
      // payload is not valid JSON; treat as empty
    }

    // check token expiry if exp claim is present
    let expired: 'true' | 'false' | 'n/a' = 'n/a';
    if (typeof payload.exp === 'number') {
      expired = payload.exp < Math.floor(Date.now() / 1000) ? 'true' : 'false';
    }

    // keep the k:v value short; long payloads are truncated with an ellipsis
    const payloadStr = JSON.stringify(payload);
    const payloadDisplay =
      payloadStr.length > 200 ? `${payloadStr.slice(0, 197)}...` : payloadStr;

    const data: Record<string, string> = {
      Signature: signatureValid ? 'valid' : 'invalid',
      Algorithm: String(header.alg),
      Payload: payloadDisplay,
      Expired: expired,
    };

    return [
      new BoxBuilder('JWT Verify', buildPlaintextLines(data))
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(data)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default JwtVerifyBoxSource;
