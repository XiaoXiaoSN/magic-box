const yamlEscape = /\\(?:x[\da-f]{2}|u[\da-f]{4}|U[\da-f]{8})/i;

export function isKubernetesSecretCandidate(input: string): boolean {
  // The parser checks the object shape. The lexical gate deliberately allows
  // comments, quoted keys, and line breaks between a key and its value.
  return (
    input.includes(':') &&
    ((input.includes('apiVersion') &&
      input.includes('kind') &&
      (input.includes('Secret') || input.includes('List'))) ||
      yamlEscape.test(input))
  );
}
