import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys, hasOptionKeys } from '@modules/Box';

const Priority = 20;
const MAX_INPUT = 100_000;

// encodes a Uint8Array to base64url (no padding)
function bytesToBase64url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// encodes a UTF-8 string to base64url via TextEncoder to handle all Unicode code points
function stringToBase64url(str: string): string {
  return bytesToBase64url(new TextEncoder().encode(str));
}

async function signHs256(
  signingInput: string,
  secret: string,
): Promise<string> {
  const keyBytes = new TextEncoder().encode(secret);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signingInputBytes = new TextEncoder().encode(signingInput);
  const signatureBuf = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    signingInputBytes,
  );
  return bytesToBase64url(new Uint8Array(signatureBuf));
}

export const JwtSignBoxSource = {
  name: 'JWT Sign',
  description:
    'Sign a JSON payload into an HS256 JWT using a secret. e.g. payload ::jwtsign=secret',
  defaultInput:
    '{"sub":"1234567890","name":"John Doe","iat":1516239022} ::jwtsign=your-256-bit-secret',
  tag: '#',
  kind: 'Encode',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'jwtsign')) return [];
    if (input.length > MAX_INPUT) return [];

    // guard for non-secure contexts where crypto.subtle is unavailable
    if (typeof crypto === 'undefined' || !crypto.subtle) {
      return [
        new BoxBuilder(
          'JWT Sign',
          'JWT signing requires a secure context (HTTPS). crypto.subtle is not available.',
        )
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const secretValue = extractOptionKeys(options, 'jwtsign');
    if (
      !secretValue ||
      typeof secretValue !== 'string' ||
      secretValue.trim() === ''
    ) {
      return [
        new BoxBuilder(
          'JWT Sign',
          'A secret is required: use ::jwtsign=your-secret',
        )
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      ];
    }

    let payload: unknown;
    try {
      payload = JSON.parse(trim(input));
    } catch {
      return [
        new BoxBuilder(
          'JWT Sign',
          'Invalid JSON payload. Please provide a valid JSON object.',
        )
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      ];
    }

    // RFC 7519 claims set must be a JSON object, not a primitive or array
    if (
      typeof payload !== 'object' ||
      payload === null ||
      Array.isArray(payload)
    ) {
      return [
        new BoxBuilder(
          'JWT Sign',
          'JWT payload must be a JSON object (not a primitive or array).',
        )
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const header = { alg: 'HS256', typ: 'JWT' };
    const b64Header = stringToBase64url(JSON.stringify(header));
    // re-stringify the parsed payload so key order is insertion order (V8 behaviour)
    const b64Payload = stringToBase64url(JSON.stringify(payload));
    const signingInput = `${b64Header}.${b64Payload}`;
    const b64Sig = await signHs256(signingInput, secretValue);
    const token = `${signingInput}.${b64Sig}`;

    return [
      new BoxBuilder('JWT Sign', token)
        .setTemplate(DefaultBoxTemplate)
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default JwtSignBoxSource;
