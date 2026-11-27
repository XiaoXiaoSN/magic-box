export function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

export async function digestHex(
  algorithm: AlgorithmIdentifier,
  bytes: BufferSource,
): Promise<string> {
  return bytesToHex(await crypto.subtle.digest(algorithm, bytes));
}
