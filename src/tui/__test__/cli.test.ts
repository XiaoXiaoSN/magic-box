// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const entry = fileURLToPath(new URL('../index.tsx', import.meta.url));

function runCli(...args: string[]) {
  const result = spawnSync('bun', [entry, ...args], {
    cwd: new URL('../../../', import.meta.url),
    encoding: 'utf8',
    timeout: 10_000,
  });
  if (result.error) throw result.error;
  return result;
}

describe('CLI conversion diagnostics', () => {
  const invalidInputs = [
    {
      source: 'ipv6',
      input: 'invalid',
      directive: '::ipv6',
      diagnostic: 'Not a valid IPv6 address',
    },
    {
      source: 'base58',
      input: '0',
      directive: '::base58decode',
      diagnostic: 'invalid Base58 input',
    },
  ];

  describe.each(invalidInputs)('$source', ({
    source,
    input,
    directive,
    diagnostic,
  }) => {
    it.each([
      { format: '--raw', stdout: '' },
      { format: '--json', stdout: '[]\n' },
    ])('reports failed conversion separately from $format results', ({
      format,
      stdout,
    }) => {
      const result = runCli('--only', source, format, input, directive);

      expect(result.status).toBe(1);
      expect(result.stdout).toBe(stdout);
      expect(result.stderr).toContain(diagnostic);
    });
  });

  it.each([
    '--raw',
    '--json',
  ])('retains a successful Base58 encoding alongside a failed decode in %s mode', (format) => {
    const result = runCli(
      '--only',
      'base58',
      format,
      '0',
      '::base58encode',
      '::base58decode',
    );

    expect(result.status).toBe(0);
    expect(result.stderr).toContain('invalid Base58 input');
    if (format === '--raw') {
      expect(result.stdout).toBe('q');
    } else {
      expect(JSON.parse(result.stdout)).toEqual([
        expect.objectContaining({ name: 'Base58 (Encode)', output: 'q' }),
      ]);
    }
  });

  it('allows decoded text containing an error-like message', () => {
    const input = 'Error: this is valid output';
    const encoded = runCli(
      '--only',
      'base58',
      '--raw',
      input,
      '::base58encode',
    );
    expect(encoded.status).toBe(0);

    const decoded = runCli(
      '--only',
      'base58',
      '--raw',
      encoded.stdout,
      '::base58decode',
    );
    expect(decoded.status).toBe(0);
    expect(decoded.stderr).toBe('');
    expect(decoded.stdout).toBe(input);
  });
});
