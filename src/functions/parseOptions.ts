import type { BoxOptions, BoxOptionValues } from '@modules/Box';

import { parseIPv6Address } from './parseIPv6';

interface ParsedDirective {
  key: string;
  value: BoxOptionValues;
}

interface ParsedInput {
  input: string;
  options: BoxOptions;
}

const isKeyStart = (character: string): boolean => /[A-Za-z_]/.test(character);

const isKeyCharacter = (character: string): boolean =>
  /[A-Za-z0-9_-]/.test(character);

/** bare option aliases that overlap valid IPv6 shorthand literals. */
export const LEGACY_HEX_OPTION_KEYS = ['ca', 'dd'] as const;

const LEGACY_HEX_OPTION_SET = new Set<string>(LEGACY_HEX_OPTION_KEYS);

const newOptions = (): Record<string, BoxOptionValues> =>
  Object.create(null) as Record<string, BoxOptionValues>;

function trimHorizontalEnd(value: string): string {
  let end = value.length;
  while (end > 0) {
    const character = value[end - 1];
    if (character !== ' ' && character !== '\t') break;
    end -= 1;
  }
  return end === value.length ? value : value.slice(0, end);
}

function parseDirectiveLine(line: string): ParsedDirective | null {
  if (!line.startsWith('::')) return null;

  const body = line.slice(2);
  if (!isKeyStart(body[0] ?? '')) return null;

  let keyEnd = 1;
  while (keyEnd < body.length && isKeyCharacter(body[keyEnd])) keyEnd += 1;

  const key = body.slice(0, keyEnd).toLowerCase();
  const suffix = body.slice(keyEnd);
  const canBeDirective =
    suffix === '' || suffix.startsWith('=') || /^\s/.test(suffix);

  // Registered bare aliases predate IPv6 classification. Other valid literals,
  // including their trailing spaces or tabs, stay input instead of partial keys.
  if (
    !(LEGACY_HEX_OPTION_SET.has(key) && canBeDirective) &&
    parseIPv6Address(trimHorizontalEnd(line)).ok
  )
    return null;

  if (suffix === '') return { key, value: true };
  if (suffix.startsWith('=')) {
    const value = suffix.slice(1).trim();
    return { key, value: value === '' ? true : value };
  }
  if (/^\s/.test(suffix)) {
    const value = suffix.trim();
    return { key, value: value === '' ? true : value };
  }

  return null;
}

function parseLines(input: string): ParsedInput {
  const normalized = input.replace(/\r\n?/g, '\n');
  const retainedLines: string[] = [];
  const options = newOptions();
  let lineStart = 0;

  for (let index = 0; index <= normalized.length; index += 1) {
    if (index !== normalized.length && normalized[index] !== '\n') continue;

    const line = normalized.slice(lineStart, index);
    const directive = parseDirectiveLine(line);
    if (directive === null) {
      retainedLines.push(line);
    } else {
      options[directive.key] = directive.value;
    }
    lineStart = index + 1;
  }

  return { input: retainedLines.join('\n').trim(), options };
}

// parses line-anchored `::option=value` directives and returns clean input.
export function parseInput(input: string): [string, BoxOptions] {
  const parsed = parseLines(input);
  return [parsed.input, parsed.options];
}

// uses the same tokenizer as parseInput so chips and sources see identical values.
export function parseOptionsForChips(
  input: string,
): Record<string, BoxOptionValues> {
  return parseLines(input).options as Record<string, BoxOptionValues>;
}
