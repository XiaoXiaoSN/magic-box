import { describe, expect, it } from 'vitest';
import { buildShareLink } from '../shareLink';

describe('buildShareLink', () => {
  it('returns the base pathname when no optional params given', () => {
    const result = buildShareLink({
      pathname: '/',
      origin: 'http://localhost:3000',
    });
    expect(result).toBe('http://localhost:3000/');
  });

  it('includes box param when provided', () => {
    const result = buildShareLink({
      box: 'JWT Decode',
      pathname: '/list',
      origin: 'http://localhost:3000',
    });
    const url = new URL(result);
    expect(url.pathname).toBe('/list');
    expect(url.searchParams.get('box')).toBe('JWT Decode');
  });

  it('includes input param when provided', () => {
    const result = buildShareLink({
      input: 'hello',
      pathname: '/',
      origin: 'http://localhost:3000',
    });
    expect(new URL(result).searchParams.get('input')).toBe('hello');
  });

  it('omits box param when empty string', () => {
    const result = buildShareLink({
      box: '',
      pathname: '/',
      origin: 'http://localhost:3000',
    });
    expect(new URL(result).searchParams.has('box')).toBe(false);
  });

  it('omits input param when empty string', () => {
    const result = buildShareLink({
      input: '',
      pathname: '/',
      origin: 'http://localhost:3000',
    });
    expect(new URL(result).searchParams.has('input')).toBe(false);
  });

  it('includes both box and input when both provided', () => {
    const result = buildShareLink({
      box: 'Base64',
      input: 'dGVzdA==',
      pathname: '/list',
      origin: 'http://localhost:3000',
    });
    const url = new URL(result);
    expect(url.searchParams.get('box')).toBe('Base64');
    expect(url.searchParams.get('input')).toBe('dGVzdA==');
  });

  it('uses window.location.origin by default', () => {
    const result = buildShareLink({ pathname: '/list' });
    const url = new URL(result);
    expect(url.origin).toBe(window.location.origin);
  });

  it('redacts a ::jwtsign secret so it does not leak into the URL', () => {
    const result = buildShareLink({
      input: '{"sub":"1"}\n::jwtsign=super-secret-key',
      pathname: '/',
      origin: 'http://localhost:3000',
    });
    const input = new URL(result).searchParams.get('input') ?? '';
    expect(input).not.toContain('super-secret-key');
    expect(input).toContain('::jwtsign=***');
  });
});
