import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// max shift amount to prevent absurdly large binary strings
const MAX_SHIFT = 4096n;

// formats a BigInt as decimal and hex, e.g. "8 (0x8)"
function fmtDecHex(n: bigint): string {
  const sign = n < 0n ? '-' : '';
  const abs = n < 0n ? -n : n;
  return `${sign}${abs} (${sign}0x${abs.toString(16)})`;
}

// formats a BigInt as decimal, hex, and binary
function fmtFull(n: bigint): string {
  const sign = n < 0n ? '-' : '';
  const abs = n < 0n ? -n : n;
  return `${sign}${abs} (${sign}0x${abs.toString(16)}) (${sign}0b${abs.toString(2)})`;
}

// builds the kvToPlaintext-style string from a Record for plaintextOutput
function kvToPlaintext(kv: Record<string, string>): string {
  return Object.entries(kv)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

// parses a single operand token; accepts leading minus, decimal, 0x, 0b
function parseOperand(token: string): bigint {
  const t = token.trim();
  if (t === '') {
    throw new Error(`empty operand`);
  }
  // BigInt() handles decimal incl. a leading minus, but throws on negative
  // radix literals like -0xff / -0b101, so peel the sign off those
  if (/^-0[xXbBoO]/.test(t)) {
    return -BigInt(t.slice(1));
  }
  return BigInt(t);
}

type BitwiseOp = '&' | '|' | '^' | '<<' | '>>';

// applies the named operator to two BigInt values; throws for invalid shifts
function applyOp(a: bigint, op: BitwiseOp, b: bigint): bigint {
  switch (op) {
    case '&':
      return a & b;
    case '|':
      return a | b;
    case '^':
      return a ^ b;
    case '<<':
      if (b < 0n || b > MAX_SHIFT) {
        throw new RangeError(
          `shift amount ${b} out of range [0, ${MAX_SHIFT}]`,
        );
      }
      return a << b;
    case '>>':
      if (b < 0n || b > MAX_SHIFT) {
        throw new RangeError(
          `shift amount ${b} out of range [0, ${MAX_SHIFT}]`,
        );
      }
      return a >> b;
  }
}

// error box shown for invalid input, explaining accepted formats
function errorBox(priority: number, message: string): Box {
  const kv: Record<string, string> = {
    Error: message,
    Formats: 'a & b  |  a | b  |  a ^ b  |  a << n  |  a >> n',
    Literals:
      'decimal (123), hex (0xff), binary (0b1010); leading minus allowed',
  };
  return new BoxBuilder('Bitwise', kvToPlaintext(kv))
    .setOptions(kv)
    .setTemplate(KeyValueBoxTemplate)
    .setShowExpandButton(false)
    .setPriority(priority)
    .build();
}

// parses "a OP b" where OP is one of &, |, ^, <<, >>; returns null if no op found
function parseExplicitOp(
  s: string,
): { a: string; op: BitwiseOp; b: string } | null {
  // match the longest operators first (<<, >>) before single-char ones
  const m = s.match(
    /^([+-]?(?:0[xX][0-9a-fA-F]+|0[bB][01]+|\d+))\s*(<<|>>|[&|^])\s*([+-]?(?:0[xX][0-9a-fA-F]+|0[bB][01]+|\d+))$/,
  );
  if (!m) {
    return null;
  }
  return { a: m[1], op: m[2] as BitwiseOp, b: m[3] };
}

// splits "a b" or "a,b" into two operand tokens; returns null if not exactly two
function parseTwoOperands(s: string): [string, string] | null {
  // split on comma or whitespace
  const parts = s.split(/[\s,]+/).filter((p) => p !== '');
  if (parts.length !== 2) {
    return null;
  }
  return [parts[0], parts[1]];
}

export const BitwiseBoxSource = {
  name: 'Bitwise',
  description:
    'Bitwise AND/OR/XOR/shifts of two integers (decimal, 0x hex, or 0b binary).',
  defaultInput: '12 & 10 ::bitwise',
  tag: '#',
  kind: 'Calculate',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'bitwise', 'bitop')) {
      return [];
    }

    const raw = trim(input);
    if (raw.length > 200) {
      return [errorBox(this.priority, 'input too long (max 200 characters)')];
    }

    // try explicit operator form first: "a OP b"
    const explicit = parseExplicitOp(raw);
    if (explicit !== null) {
      let a: bigint;
      let b: bigint;
      try {
        a = parseOperand(explicit.a);
        b = parseOperand(explicit.b);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return [errorBox(this.priority, `parse error: ${msg}`)];
      }

      let result: bigint;
      try {
        result = applyOp(a, explicit.op, b);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return [errorBox(this.priority, msg)];
      }

      const kv: Record<string, string> = {
        Expression: `${explicit.a} ${explicit.op} ${explicit.b}`,
        'Result (dec)': String(result),
        'Result (hex)': `${result < 0n ? '-' : ''}0x${(result < 0n ? -result : result).toString(16)}`,
        'Result (bin)': `${result < 0n ? '-' : ''}0b${(result < 0n ? -result : result).toString(2)}`,
      };
      return [
        new BoxBuilder('Bitwise', kvToPlaintext(kv))
          .setOptions(kv)
          .setTemplate(KeyValueBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      ];
    }

    // try two-operand form: "a b" or "a,b" — computes all ops
    const pair = parseTwoOperands(raw);
    if (pair !== null) {
      let a: bigint;
      let b: bigint;
      try {
        a = parseOperand(pair[0]);
        b = parseOperand(pair[1]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return [errorBox(this.priority, `parse error: ${msg}`)];
      }

      const kv: Record<string, string> = {
        A: fmtDecHex(a),
        B: fmtDecHex(b),
        AND: fmtDecHex(a & b),
        OR: fmtDecHex(a | b),
        XOR: fmtDecHex(a ^ b),
      };

      // include shifts only when b is non-negative and within cap
      if (b >= 0n && b <= MAX_SHIFT) {
        kv['A<<B'] = fmtFull(a << b);
        kv['A>>B'] = fmtFull(a >> b);
      }

      return [
        new BoxBuilder('Bitwise', kvToPlaintext(kv))
          .setOptions(kv)
          .setTemplate(KeyValueBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      ];
    }

    // nothing matched
    return [
      errorBox(
        this.priority,
        `cannot parse "${raw}" — expected "a OP b" or two operands`,
      ),
    ];
  },
};

export default BitwiseBoxSource;
