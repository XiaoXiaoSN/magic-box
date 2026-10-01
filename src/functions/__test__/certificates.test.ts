import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CertificateBoxSource from '../../modules/boxSources/CertificateBoxSource';
import { decodeCertificates } from '../certificates';

import pem from './fixtures/certificate';

describe('certificate decoding', () => {
  beforeEach(() => vi.stubGlobal('crypto', webcrypto));
  afterEach(() => vi.unstubAllGlobals());

  it('decodes identity, SANs, algorithms, and a fingerprint verified with OpenSSL', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    const [output] = await decodeCertificates(pem, new Date('2026-10-02'));
    expect(output).toContain('Subject: CN=Magic Box test, O=Magic Box');
    expect(output).toContain('Issuer: CN=Magic Box test, O=Magic Box');
    expect(output).toContain('example.com');
    expect(output).toContain('RSA');
    expect(output).toContain('Within validity period');
    expect(output).toContain(
      '43:1B:74:45:35:92:56:7B:06:0C:10:A9:82:87:CD:EA:5D:57:69:B0:4D:3F:C0:8D:35:8B:E0:49:D8:B8:6C:98',
    );
    expect(fetch).not.toHaveBeenCalled();
    fetch.mockRestore();
  });

  it('handles multiple certificates in order and detects expiry/not-yet-valid dates', async () => {
    expect(
      await decodeCertificates(`${pem}\n${pem}`, new Date('2100-01-01')),
    ).toHaveLength(2);
    expect(
      (await decodeCertificates(pem, new Date('2100-01-01')))[0],
    ).toContain('Validity: Expired');
    expect(
      (await decodeCertificates(pem, new Date('2000-01-01')))[0],
    ).toContain('Not yet valid');
  });

  it('accepts base64 DER with an explicit option', async () => {
    const base64 = pem.replace(/-----[^\n]+-----/g, '').replace(/\s/g, '');
    const boxes = await CertificateBoxSource.generateBoxes(base64, {
      cert: true,
    });
    expect(boxes[0].props.plaintextOutput).toContain('SHA-256 fingerprint');
    expect(await CertificateBoxSource.generateBoxes('ordinary text')).toEqual(
      [],
    );
  });

  it.each([
    ['-----BEGIN CERTIFICATE-----\nAAAA', 'Incomplete'],
    ['-----END CERTIFICATE-----', 'Incomplete'],
    [
      '-----BEGIN CERTIFICATE-----\nAAAA\n-----END CERTIFICATE-----',
      'Unable to decode',
    ],
    [pem.repeat(21), 'at most 20'],
    ['x'.repeat(100_001), 'exceeds'],
    [
      '-----BEGIN PRIVATE KEY-----\nnot-a-key\n-----END PRIVATE KEY-----',
      'public X.509',
    ],
  ])('rejects malformed/unsupported input with a clear error', async (input, message) => {
    await expect(decodeCertificates(input)).rejects.toThrow(message);
    const boxes = await CertificateBoxSource.generateBoxes(input, {
      cert: true,
    });
    expect(boxes[0].props.plaintextOutput).toContain(message);
  });
});
