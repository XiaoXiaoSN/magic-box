import type { Box, BoxOptions } from '@modules/Box';
import { errorBox, hasOptionKeys, keyValueBox } from '@modules/Box';

const Priority = 10;
const BoxName = 'chmod Calculator';
const MAX_INPUT_LENGTH = 64;
const SYMBOLIC_MODE =
  /^([-dlcbps])?([r-][w-][xSs-][r-][w-][xSs-][r-][w-][xTt-])$/;
const FILE_TYPES: Readonly<Record<string, string>> = {
  '-': 'regular file',
  b: 'block device',
  c: 'character device',
  d: 'directory',
  l: 'symbolic link',
  p: 'FIFO',
  s: 'socket',
};

interface ParsedMode {
  mode: number;
  fileType: string | null;
}

function parseOctal(value: string): ParsedMode | null {
  if (!/^\d{3,4}$/.test(value)) return null;
  if (!/^[0-7]{3,4}$/.test(value)) return null;
  return { mode: Number.parseInt(value, 8), fileType: null };
}

function parseSymbolic(value: string): ParsedMode | null {
  const match = SYMBOLIC_MODE.exec(value);
  if (!match) return null;

  const permissions = match[2];
  const bits = [0o400, 0o200, 0o100, 0o040, 0o020, 0o010, 0o004, 0o002, 0o001];
  let mode = 0;
  for (let index = 0; index < permissions.length; index += 1) {
    const character = permissions[index];
    if (character === 'r' || character === 'w') mode |= bits[index];
    if (character === 'x' || character === 's' || character === 't') {
      mode |= bits[index];
    }
    if (character === 's' || character === 'S') {
      mode |= index === 2 ? 0o4000 : 0o2000;
    }
    if (character === 't' || character === 'T') mode |= 0o1000;
  }
  return { mode, fileType: match[1] ? FILE_TYPES[match[1]] : null };
}

function parseAssignments(value: string): ParsedMode | null {
  const clauses = value.split(',');
  if (clauses.length !== 3) return null;

  const classBits: Record<
    string,
    { read: number; write: number; execute: number; special: number }
  > = {
    u: { read: 0o400, write: 0o200, execute: 0o100, special: 0o4000 },
    g: { read: 0o040, write: 0o020, execute: 0o010, special: 0o2000 },
    o: { read: 0o004, write: 0o002, execute: 0o001, special: 0o1000 },
  };
  const seen = new Set<string>();
  let mode = 0;

  for (const clause of clauses) {
    const match = /^([ugo])=([rwxstST]*)$/.exec(clause);
    if (!match || seen.has(match[1])) return null;
    const [who, permissions] = match.slice(1);
    seen.add(who);
    const bits = classBits[who];
    const allowed = who === 'o' ? /^[rwxtT]*$/ : /^[rwxsS]*$/;
    if (
      !allowed.test(permissions) ||
      new Set(permissions.toLowerCase()).size !== permissions.length
    )
      return null;
    if (permissions.includes('r')) mode |= bits.read;
    if (permissions.includes('w')) mode |= bits.write;
    if (permissions.includes('x')) mode |= bits.execute;
    if (
      permissions.includes('s') ||
      permissions.includes('S') ||
      permissions.includes('t') ||
      permissions.includes('T')
    ) {
      mode |= bits.special;
    }
  }

  return seen.size === 3 ? { mode, fileType: null } : null;
}

function parseMode(value: string): ParsedMode | null {
  return parseOctal(value) ?? parseSymbolic(value) ?? parseAssignments(value);
}

function symbolicPermissions(mode: number): string {
  const readWriteExecute = [
    0o400, 0o200, 0o100, 0o040, 0o020, 0o010, 0o004, 0o002, 0o001,
  ];
  const output: string[] = readWriteExecute.map((bit, index) => {
    if (mode & bit) return index % 3 === 0 ? 'r' : index % 3 === 1 ? 'w' : 'x';
    return '-';
  });
  if (mode & 0o4000) output[2] = mode & 0o100 ? 's' : 'S';
  if (mode & 0o2000) output[5] = mode & 0o010 ? 's' : 'S';
  if (mode & 0o1000) output[8] = mode & 0o001 ? 't' : 'T';
  return output.join('');
}

function classAssignment(
  mode: number,
  mask: number,
  specialBit: number,
  special: string,
): string {
  let value = '';
  if (mode & (mask & 0o444)) value += 'r';
  if (mode & (mask & 0o222)) value += 'w';
  if (mode & (mask & 0o111)) value += 'x';
  if (mode & specialBit) value += special;
  return value;
}

function formatOctal(mode: number): string {
  return mode.toString(8).padStart(4, '0');
}

function modeBox(parsed: ParsedMode): Box {
  const { mode, fileType } = parsed;
  const symbolic = symbolicPermissions(mode);
  const fields: Record<string, string> = {
    Octal: formatOctal(mode),
    Symbolic: `${fileType ? `${Object.keys(FILE_TYPES).find((key) => FILE_TYPES[key] === fileType)}` : ''}${symbolic}`,
    Assignments: [
      `u=${classAssignment(mode, 0o700, 0o4000, 's')}`,
      `g=${classAssignment(mode, 0o070, 0o2000, 's')}`,
      `o=${classAssignment(mode, 0o007, 0o1000, 't')}`,
    ].join(','),
    Setuid: mode & 0o4000 ? 'on' : 'off',
    Setgid: mode & 0o2000 ? 'on' : 'off',
    Sticky: mode & 0o1000 ? 'on' : 'off',
    Command: `chmod ${formatOctal(mode)} <file>`,
  };
  if (fileType) fields['File type'] = fileType;
  return keyValueBox('keyValue', BoxName, fields, { priority: Priority });
}

function parseUmask(value: string): number | null {
  if (!/^[0-7]{3,4}$/.test(value)) return null;
  const mask = Number.parseInt(value, 8);
  return mask <= 0o777 ? mask : null;
}

function umaskBox(mask: number): Box {
  const fileMode = 0o666 & ~mask;
  const directoryMode = 0o777 & ~mask;
  return keyValueBox(
    'keyValue',
    'umask Calculator',
    {
      Umask: formatOctal(mask),
      'New file (base 0666)': formatOctal(fileMode),
      'New directory (base 0777)': formatOctal(directoryMode),
    },
    { priority: Priority },
  );
}

export const ChmodBoxSource = {
  defaultDisabled: true,
  name: BoxName,
  description:
    'Convert absolute octal, rwx symbolic, and u/g/o permission modes with ::chmod. Use ::umask=022 for standard new-file and directory permissions.',
  defaultInput: '4755\n::chmod',
  tag: 'rwx',
  kind: 'Convert',
  priority: Priority,

  canHandle(_input: string, options: BoxOptions): boolean {
    return hasOptionKeys(options, 'chmod', 'umask');
  },

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const chmodRequested = hasOptionKeys(options, 'chmod');
    const umaskRequested = hasOptionKeys(options, 'umask');
    if (!chmodRequested && !umaskRequested) return [];
    const chmodValue = options?.chmod;
    const umaskValue = options?.umask;
    if (
      input.length > MAX_INPUT_LENGTH ||
      (typeof chmodValue === 'string' &&
        chmodValue.length > MAX_INPUT_LENGTH) ||
      (typeof umaskValue === 'string' && umaskValue.length > MAX_INPUT_LENGTH)
    ) {
      return [
        errorBox(
          BoxName,
          'chmod Calculator supports input up to 64 characters.',
          { priority: this.priority },
        ),
      ];
    }

    const boxes: Box[] = [];
    if (chmodRequested) {
      const value = (
        typeof chmodValue === 'string' ? chmodValue : input
      ).trim();
      const parsed = parseMode(value);
      if (!parsed) {
        return [
          errorBox(
            BoxName,
            'Use a 3–4 digit octal mode, nine rwx permission characters, or absolute u=...,g=...,o=... assignments. Relative forms such as u+x need a known starting mode.',
            { priority: this.priority },
          ),
        ];
      }
      boxes.push(modeBox(parsed));
    }

    if (umaskRequested) {
      const value = typeof umaskValue === 'string' ? umaskValue.trim() : '';
      const mask = parseUmask(value);
      if (mask === null) {
        return [
          errorBox(
            BoxName,
            'Use ::umask with a 3–4 digit octal mask from 000 to 777.',
            {
              priority: this.priority,
            },
          ),
        ];
      }
      boxes.push(umaskBox(mask));
    }
    return boxes;
  },
};

export default ChmodBoxSource;
