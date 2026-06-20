import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// octal digit (0-7) → rwx string, applying special-bit override to the execute slot
function digitToRwx(
  digit: number,
  specialExecuteChar: 's' | 't' | null,
): string {
  const r = digit & 4 ? 'r' : '-';
  const w = digit & 2 ? 'w' : '-';
  const hasX = !!(digit & 1);

  let x: string;
  if (specialExecuteChar !== null) {
    // 's'/'t' when execute bit set, 'S'/'T' when not
    x = hasX ? specialExecuteChar : specialExecuteChar.toUpperCase();
  } else {
    x = hasX ? 'x' : '-';
  }

  return r + w + x;
}

// convert 3- or 4-digit octal string to 9-char symbolic permissions
function octalToSymbolic(octal: string): string {
  const digits = octal.length === 4 ? octal : `0${octal}`;
  const special = Number.parseInt(digits[0], 10);
  const user = Number.parseInt(digits[1], 10);
  const group = Number.parseInt(digits[2], 10);
  const other = Number.parseInt(digits[3], 10);

  const setuid = !!(special & 4);
  const setgid = !!(special & 2);
  const sticky = !!(special & 1);

  const userStr = digitToRwx(user, setuid ? 's' : null);
  const groupStr = digitToRwx(group, setgid ? 's' : null);
  const otherStr = digitToRwx(other, sticky ? 't' : null);

  return userStr + groupStr + otherStr;
}

// convert 9-char symbolic permission string back to octal, including special bits
function symbolicToOctal(sym: string): string {
  // each group of 3 chars: r w x/s/S/t/T
  function groupToDigit(chars: string): number {
    const r = chars[0] === 'r' ? 4 : 0;
    const w = chars[1] === 'w' ? 2 : 0;
    // lowercase x/s/t all count as execute bit set
    const x = 'xst'.includes(chars[2]) ? 1 : 0;
    return r + w + x;
  }

  const userStr = sym.slice(0, 3);
  const groupStr = sym.slice(3, 6);
  const otherStr = sym.slice(6, 9);

  const userDigit = groupToDigit(userStr);
  const groupDigit = groupToDigit(groupStr);
  const otherDigit = groupToDigit(otherStr);

  // detect special bits from the execute slot character
  const setuid = 'sS'.includes(userStr[2]) ? 4 : 0;
  const setgid = 'sS'.includes(groupStr[2]) ? 2 : 0;
  const sticky = 'tT'.includes(otherStr[2]) ? 1 : 0;
  const specialDigit = setuid | setgid | sticky;

  const base = `${userDigit}${groupDigit}${otherDigit}`;
  return specialDigit !== 0 ? `${specialDigit}${base}` : base;
}

const OCTAL_RE = /^[0-7]{3,4}$/;
// positional grammar: r/w on fixed slots, execute slots also carry special bits
const SYMBOLIC_RE = /^[r-][w-][xsS-][r-][w-][xsS-][r-][w-][xtT-]$/;

export const ChmodBoxSource = {
  name: 'Chmod',
  description:
    'Convert Unix file permissions between octal (e.g. 755) and symbolic (e.g. rwxr-xr-x).',
  defaultInput: '755 ::chmod',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'chmod')) return [];

    const s = trim(input);
    if (!s) return [];

    let octal: string;
    let symbolic: string;

    if (OCTAL_RE.test(s)) {
      octal = s;
      symbolic = octalToSymbolic(s);
    } else if (SYMBOLIC_RE.test(s)) {
      symbolic = s;
      octal = symbolicToOctal(s);
    } else {
      return [];
    }

    const output: Record<string, string> = {
      Octal: octal,
      Symbolic: symbolic,
    };

    const content = Object.entries(output)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    return [
      new BoxBuilder('Chmod', content)
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(output)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default ChmodBoxSource;
