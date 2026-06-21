import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// octal digit → rwx triplet string
function octalDigitToRwx(digit: number): string {
  const r = digit & 4 ? 'r' : '-';
  const w = digit & 2 ? 'w' : '-';
  const x = digit & 1 ? 'x' : '-';
  return `${r}${w}${x}`;
}

// build symbolic string from 3-digit octal value (user/group/other)
// if special != 0: bit 4=setuid (user x→s/S), bit 2=setgid (group x→s/S), bit 1=sticky (other x→t/T)
function octalToSymbolic(octalStr: string): string {
  let special = 0;
  let digits: string;

  if (octalStr.length === 4) {
    special = Number.parseInt(octalStr[0], 8);
    digits = octalStr.slice(1);
  } else {
    digits = octalStr;
  }

  const u = Number.parseInt(digits[0], 8);
  const g = Number.parseInt(digits[1], 8);
  const o = Number.parseInt(digits[2], 8);

  let userRwx = octalDigitToRwx(u);
  let groupRwx = octalDigitToRwx(g);
  let otherRwx = octalDigitToRwx(o);

  if (special & 4) {
    // setuid: replace user x with 's' (x set) or 'S' (x not set)
    userRwx = userRwx.slice(0, 2) + (u & 1 ? 's' : 'S');
  }
  if (special & 2) {
    // setgid: replace group x with 's'/'S'
    groupRwx = groupRwx.slice(0, 2) + (g & 1 ? 's' : 'S');
  }
  if (special & 1) {
    // sticky: replace other x with 't'/'T'
    otherRwx = otherRwx.slice(0, 2) + (o & 1 ? 't' : 'T');
  }

  return `${userRwx}${groupRwx}${otherRwx}`;
}

// human-readable description of a single rwx triplet
function rwxDescription(rwx: string, label: string): string {
  const parts: string[] = [];
  if (rwx[0] === 'r') parts.push('read');
  if (rwx[1] === 'w') parts.push('write');
  const x = rwx[2];
  if (x === 'x' || x === 's' || x === 't') parts.push('execute');
  if (x === 's' || x === 'S') parts.push('setuid/setgid');
  if (x === 't' || x === 'T') parts.push('sticky');
  return parts.length > 0
    ? `${label}: ${parts.join(', ')}`
    : `${label}: no permissions`;
}

// build description string from symbolic (9 chars, after stripping file-type prefix)
function symbolicDescription(sym: string): string {
  const user = rwxDescription(sym.slice(0, 3), 'user');
  const group = rwxDescription(sym.slice(3, 6), 'group');
  const other = rwxDescription(sym.slice(6, 9), 'other');
  return `${user}; ${group}; ${other}`;
}

// symbolic 9-char string → octal string (3 or 4 digits)
function symbolicToOctal(sym: string): string {
  let special = 0;

  // compute each triad's base value (r=4, w=2, x=1)
  function triadValue(triad: string): number {
    let v = 0;
    if (triad[0] === 'r') v += 4;
    if (triad[1] === 'w') v += 2;
    const x = triad[2];
    if (x === 'x' || x === 's' || x === 't') v += 1;
    return v;
  }

  const u = triadValue(sym.slice(0, 3));
  const g = triadValue(sym.slice(3, 6));
  const o = triadValue(sym.slice(6, 9));

  // accumulate special bits from symbolic chars
  const ux = sym[2];
  const gx = sym[5];
  const ox = sym[8];
  if (ux === 's' || ux === 'S') special |= 4;
  if (gx === 's' || gx === 'S') special |= 2;
  if (ox === 't' || ox === 'T') special |= 1;

  const base = `${u}${g}${o}`;
  return special > 0 ? `${special}${base}` : base;
}

export const ChmodBoxSource = {
  name: 'chmod',
  description:
    'Convert Unix permissions between octal (755) and symbolic (rwxr-xr-x).',
  defaultInput: '755 ::chmod',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'chmod', 'permissions')) return [];

    const raw = trim(input);

    // octal input: 3 or 4 octal digits
    if (/^[0-7]{3,4}$/.test(raw)) {
      const symbolic = octalToSymbolic(raw);
      const description = symbolicDescription(symbolic);
      return [
        new BoxBuilder('chmod', '')
          .setOptions({
            Octal: raw,
            Symbolic: symbolic,
            Description: description,
          })
          .setTemplate(KeyValueBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }

    // symbolic input: 9 or 10 chars (optional leading file-type char)
    if (/^[-rwxsStTdlcbp]{9,10}$/.test(raw)) {
      // strip leading file-type character if present (e.g. 'd' in 'drwxr-xr-x')
      const sym9 = raw.length === 10 ? raw.slice(1) : raw;

      // validate that sym9 is a proper 9-char permission string
      if (!/^[-rwxsStT]{9}$/.test(sym9)) {
        return [invalidFormatBox(this.priority)];
      }

      const octal = symbolicToOctal(sym9);
      const description = symbolicDescription(sym9);
      return [
        new BoxBuilder('chmod', '')
          .setOptions({
            Octal: octal,
            Symbolic: sym9,
            Description: description,
          })
          .setTemplate(KeyValueBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }

    // unrecognized input: explain expected formats
    return [invalidFormatBox(this.priority)];
  },
};

function invalidFormatBox(priority: number): Box {
  return new BoxBuilder(
    'chmod',
    'Enter an octal permission (e.g. 755) or symbolic string (e.g. rwxr-xr-x).',
  )
    .setPriority(priority)
    .build();
}

export default ChmodBoxSource;
