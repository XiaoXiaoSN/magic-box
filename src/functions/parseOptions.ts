import type { BoxOptions } from '@modules/Box';

// Parses input text and inline `::option=value` directives, returning the
// cleaned input and a map of options. Options may appear on the very first
// line or after a newline — a leading `\n` is NOT required.
//
// Example:
//   ::qrcode
//   Hello World
//   ::locale=tw
// → input='Hello World', options={qrcode: true, locale: 'tw'}
export const parseInput = (input: string): [string, BoxOptions] => {
  // `(?:^|\n)` lets the directive appear at the very start of the string, not
  // just after a newline. `(.*)` captures any value including spaces.
  const regex = /(?:^|\n)::(\w+)=?(.*)/gm;
  const matches = Array.from(input.matchAll(regex), (match) => [
    match[1],
    match[2],
  ]);

  const initOptions: BoxOptions = {};
  const options = matches.reduce((opts, [key, value]) => {
    const updatedOpts = opts;
    updatedOpts[key.toLowerCase()] = value || true;
    return updatedOpts;
  }, initOptions);

  const replacedInput = input.replaceAll(regex, '').trim();
  return [replacedInput, options];
};

// Parses inline `::option=value` directives for display as UI chips.
// Uses `(\S*)` (no spaces in value) intentionally — chip display only needs
// the first token. Options may appear on the first line or after a newline.
export const parseOptionsForChips = (
  input: string,
): Record<string, string | true> => {
  const regex = /(?:^|\n)::(\w+)=?(\S*)/gm;
  const opts: Record<string, string | true> = {};
  for (const match of input.matchAll(regex)) {
    const key = match[1].toLowerCase();
    const value = match[2];
    opts[key] = value || true;
  }
  return opts;
};
