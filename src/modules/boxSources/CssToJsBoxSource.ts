import { CodeBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// convert kebab-case CSS property to camelCase JS property
// vendor prefixes like -webkit-x become WebkitX (capital first letter per React convention)
function kebabToCamel(prop: string): string {
  const trimmed = prop.trim();

  // vendor prefix: leading hyphen, e.g. -webkit-box-shadow → WebkitBoxShadow
  if (trimmed.startsWith('-')) {
    return trimmed
      .slice(1)
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
  }

  // standard kebab-case → camelCase
  return trimmed.replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
}

// convert camelCase JS property back to kebab-case CSS property
// React vendor prefix convention: leading uppercase segment → hyphen prefix
// e.g. WebkitBoxShadow → -webkit-box-shadow
function camelToKebab(prop: string): string {
  // detect leading capital-only segment as vendor prefix (e.g. Webkit, Moz, Ms, O)
  const vendorMatch = prop.match(/^([A-Z][a-z]*)(.+)/);
  if (vendorMatch) {
    const vendor = vendorMatch[1].toLowerCase();
    const rest = vendorMatch[2];
    const restKebab = rest.replace(/([A-Z])/g, '-$1').toLowerCase();
    return `-${vendor}${restKebab}`;
  }

  return prop.replace(/([A-Z])/g, '-$1').toLowerCase();
}

// convert CSS declaration block to a JS object literal string
function cssToJs(css: string): string {
  const pairs: string[] = [];

  for (const decl of css.split(';')) {
    const colonIdx = decl.indexOf(':');
    if (colonIdx === -1) continue;

    const prop = decl.slice(0, colonIdx).trim();
    const value = decl.slice(colonIdx + 1).trim();

    if (!prop || !value) continue;

    const jsProp = kebabToCamel(prop);
    pairs.push(`  ${jsProp}: "${value}"`);
  }

  return `{\n${pairs.join(',\n')}\n}`;
}

// convert a JS style object literal to CSS declarations
function jsToCss(js: string): string {
  const lines: string[] = [];

  // lenient extraction: match key: "value" or key: value pairs
  const pairRegex = /([a-zA-Z][a-zA-Z0-9]*):\s*["']?([^"',}\n]+)["']?/g;
  let match: RegExpExecArray | null;

  // biome-ignore lint/suspicious/noAssignInExpressions: standard regex loop pattern
  while ((match = pairRegex.exec(js)) !== null) {
    const jsProp = match[1].trim();
    const value = match[2].trim();
    if (!jsProp || !value) continue;

    const cssProp = camelToKebab(jsProp);
    lines.push(`${cssProp}: ${value};`);
  }

  return lines.join('\n');
}

export const CssToJsBoxSource = {
  name: 'CSS to JS',
  description:
    'Convert CSS declarations to a React/JS style object, or a JS style object back to CSS.',
  defaultInput: 'background-color: red;\nfont-size: 14px; ::cssjs',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'cssjs', 'csstojs')) return [];
    if (input.length > MAX_INPUT) return [];

    const trimmed = trim(input);
    if (!trimmed) return [];

    // detect direction: if input starts with '{' it is a JS object → convert to CSS
    const isJsInput = trimmed.startsWith('{');

    if (isJsInput) {
      const cssOutput = jsToCss(trimmed);
      if (!cssOutput) return [];

      return [
        new BoxBuilder('JS to CSS', cssOutput)
          .setOptions({ language: 'css' })
          .setTemplate(CodeBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const jsOutput = cssToJs(trimmed);
    if (!jsOutput || jsOutput === '{\n\n}') return [];

    return [
      new BoxBuilder('CSS to JS', jsOutput)
        .setOptions({ language: 'javascript' })
        .setTemplate(CodeBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default CssToJsBoxSource;
