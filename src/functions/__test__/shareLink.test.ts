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

  it('includes an explicit empty input param', () => {
    const result = buildShareLink({
      input: '',
      pathname: '/',
      origin: 'http://localhost:3000',
    });
    expect(new URL(result).searchParams.get('input')).toBe('');
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

  it.each([
    'jwt\n::SECRET = top-secret',
    'message\n::sha256=test-key\n::sha256',
    'test-password\n::pbkdf2=salt',
    'apiVersion: v1\nkind: Secret\nstringData: { token: dummy }',
  ])('omits private input from a share URL', (input) => {
    const result = buildShareLink({
      input,
      pathname: '/',
      origin: 'http://localhost:3000',
    });
    const url = new URL(result);
    expect(url.searchParams.has('input')).toBe(false);
  });

  it('uses window.location.origin by default', () => {
    const result = buildShareLink({ pathname: '/list' });
    const url = new URL(result);
    expect(url.origin).toBe(window.location.origin);
  });
});
