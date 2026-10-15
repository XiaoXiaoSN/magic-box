import { describe, expect, it } from 'vitest';

import { formatIPv6Address, parseIPv6Address } from '../parseIPv6';

describe('parseIPv6Address', () => {
  it.each([
    '::',
    '::1',
    '::abcd',
    '2001:db8::1',
    '::ffff:192.168.1.1',
    '[2001:db8::1]',
    'fe80::1%eth0',
    '2001:db8::/48',
    '[fe80::1%eth0]/64',
  ])('accepts %s', (raw) => {
    const result = parseIPv6Address(raw);
    expect(result.ok).toBe(true);
  });

  it.each([
    '1:2:3:4:5:6:7',
    '1:2:3:4:5:6:7:8:9',
    '1::2::3',
    '1:2:3:4:5:6:7:8::',
    '::1:2:3:4:5:6:7:8',
    '::ffff:192.168.1.256',
    '192.168.1.1::',
    '2001:db8::1/129',
    '2001:db8::1/-1',
    '[2001:db8::1]tail',
    'fe80::1%',
  ])('rejects %s', (raw) => {
    const result = parseIPv6Address(raw);
    expect(result.ok).toBe(false);
  });

  it('derives the exact network range and count for a CIDR', () => {
    const result = parseIPv6Address('2001:db8::1234/64');
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;

    expect(result.address.network).toBe(0x20010db8000000000000000000000000n);
    expect(result.address.last).toBe(0x20010db800000000ffffffffffffffffn);
    expect(result.address.count).toBe(18446744073709551616n);
  });

  it('uses RFC 5952 lowercase and the leftmost longest zero run', () => {
    const result = parseIPv6Address('2001:db8:0:0:1:0:0:1');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.address.compressed).toBe('2001:db8::1:0:0:1');
    }
  });

  it('formats a 128-bit value without a broadcast label', () => {
    expect(formatIPv6Address((1n << 128n) - 1n).compressed).toBe(
      'ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff',
    );
  });
});
