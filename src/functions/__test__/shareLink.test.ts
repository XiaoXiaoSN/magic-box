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

  it('redacts the ::hmac key value so it never leaks into the URL', () => {
    const result = buildShareLink({
      input: 'message ::hmac=mysecretkey',
      pathname: '/',
      origin: 'http://localhost:3000',
    });
    const shared = new URL(result).searchParams.get('input') ?? '';
    expect(shared).not.toContain('mysecretkey');
    expect(shared).toContain('::hmac=<redacted>');
  });

  it('redacts the ::jwtsign secret value', () => {
    const result = buildShareLink({
      input: 'payload ::jwtsign=topsecret',
      pathname: '/',
      origin: 'http://localhost:3000',
    });
    const shared = new URL(result).searchParams.get('input') ?? '';
    expect(shared).not.toContain('topsecret');
  });
});
