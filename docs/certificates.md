# Certificate Decode

Paste a PEM certificate or a CA bundle containing multiple
`-----BEGIN CERTIFICATE-----` blocks. Magic Box creates one result per certificate.
For base64-encoded DER, add `::cert` (`::certificate` and `::ca` also work).

Each result includes subject, issuer, serial number, UTC validity dates, current
validity status, SHA-256 fingerprint, public-key and signature information,
and decoded extensions such as Subject Alternative Names and Basic Constraints.
Decode results can be expanded and copied.

Decoding runs entirely in the browser using the browser-compatible
`@peculiar/x509` parser and Web Crypto. Certificates are never sent to a server.
The input limit is 100,000 characters and at most 20 certificates per bundle.
Incomplete blocks, malformed certificates, private keys, and certificate requests
produce a readable error. A decoded certificate is not a trust-chain, signature,
or revocation verification.
