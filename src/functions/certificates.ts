export async function decodeCertificates(
  input: string,
  now = new Date(),
): Promise<string[]> {
  if (input.length > 100_000)
    throw new Error('Certificate input exceeds 100000 characters.');
  if (/-----BEGIN (?:.*PRIVATE KEY|CERTIFICATE REQUEST)-----/.test(input)) {
    throw new Error(
      'Paste public X.509 certificates only, without private keys or certificate requests.',
    );
  }
  const blocks =
    input.match(
      /-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g,
    ) ?? [];
  const starts = (input.match(/-----BEGIN CERTIFICATE-----/g) ?? []).length;
  const ends = (input.match(/-----END CERTIFICATE-----/g) ?? []).length;
  if (starts !== blocks.length || ends !== blocks.length)
    throw new Error('Incomplete PEM certificate block.');
  if (blocks.length > 20)
    throw new Error('A bundle may contain at most 20 certificates.');
  const encoded = blocks.length ? blocks : [input.trim()];
  if (!encoded[0])
    throw new Error(
      'Paste a PEM certificate or base64-encoded DER certificate.',
    );
  await import('reflect-metadata');
  const { X509Certificate } = await import('@peculiar/x509');
  return Promise.all(
    encoded.map(async (pem, index) => {
      try {
        const certificate = new X509Certificate(pem);
        // Pass Web Crypto explicitly; the singleton provider is shared by other consumers.
        const digest = await certificate.getThumbprint(
          'SHA-256',
          globalThis.crypto,
        );
        const fingerprint = Array.from(new Uint8Array(digest), (byte) =>
          byte.toString(16).padStart(2, '0').toUpperCase(),
        ).join(':');
        const validity =
          now < certificate.notBefore
            ? 'Not yet valid'
            : now > certificate.notAfter
              ? 'Expired'
              : 'Within validity period';
        return `Subject: ${certificate.subject}\nIssuer: ${certificate.issuer}\nSerial number: ${certificate.serialNumber}\nNot before: ${certificate.notBefore.toISOString()}\nNot after: ${certificate.notAfter.toISOString()}\nValidity: ${validity}\nSHA-256 fingerprint: ${fingerprint}\n\n${certificate.toString('text')}\n\nDecoded locally. This does not verify trust, revocation, or the certificate chain.`;
      } catch {
        throw new Error(
          `Unable to decode certificate ${index + 1}. Check the X.509 data and Web Crypto availability.`,
        );
      }
    }),
  );
}
