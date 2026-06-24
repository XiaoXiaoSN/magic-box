import unitless from '@emotion/unitless';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, errorBox, hasOptionKeys } from '@modules/Box';
import { parse } from 'css-tree';
import JSON5 from 'json5';

const MAX_INPUT = 100_000;
const PROPERTY = /^(?:--[\w-]+|-?[a-zA-Z][a-zA-Z0-9-]*)$/;

function kebabToCamel(property: string): string {
  if (property.startsWith('--')) return property;
  return property
    .toLowerCase()
    .replace(/^-ms-/, 'ms-')
    .replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

function camelToKebab(property: string): string {
  if (property.startsWith('--')) return property;
  if (property === 'cssFloat') return 'float';
  return property
    .replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
    .replace(/^ms-/, '-ms-');
}

function cssToJs(css: string): string {
  const ast = parse(css, {
    context: 'declarationList',
    positions: true,
    onParseError(error) {
      throw error;
    },
  });
  if (ast.type !== 'DeclarationList')
    throw new Error('Enter CSS declarations.');
  const pairs = new Map<string, string>();
  ast.children.forEach((node) => {
    if (node.type === 'Comment') return;
    if (node.type !== 'Declaration' || !PROPERTY.test(node.property)) {
      throw new Error('Enter CSS declarations, such as color: red;');
    }
    if (node.important) {
      throw new Error('React style objects do not support !important.');
    }
    const location = node.value.loc;
    if (!location) throw new Error('Missing CSS value.');
    // Keep the original value so comments and quoted/URL contents retain meaning.
    const value = css.slice(location.start.offset, location.end.offset).trim();
    if (!value) throw new Error('Missing CSS value.');
    const key = kebabToCamel(node.property);
    // The last declaration must keep its order relative to shorthands.
    pairs.delete(key);
    pairs.set(key, value);
  });
  if (pairs.size === 0) return '';
  return `{\n${[...pairs].map(([key, value]) => `  ${key.startsWith('--') ? JSON.stringify(key) : key}: ${JSON.stringify(value)}`).join(',\n')}\n}`;
}

function jsToCss(js: string): string {
  // JSON5 accepts literal keys and strings without evaluating JavaScript.
  const style: unknown = JSON5.parse(js);
  if (style === null || typeof style !== 'object' || Array.isArray(style)) {
    throw new Error('Enter a literal style object.');
  }
  const lines: string[] = [];
  for (const [property, value] of Object.entries(style)) {
    const cssProperty = camelToKebab(property);
    if (!PROPERTY.test(cssProperty)) throw new Error('Invalid style property.');
    if (typeof value !== 'string' && typeof value !== 'number') {
      throw new Error('Style values must be strings or finite numbers.');
    }
    if (typeof value === 'number' && !Number.isFinite(value)) {
      throw new Error('Style values must be strings or finite numbers.');
    }
    const unprefixed = property.replace(
      /^(?:Webkit|Moz|ms|O)([A-Z])/,
      (_, letter: string) => letter.toLowerCase(),
    );
    const needsPx =
      typeof value === 'number' &&
      value !== 0 &&
      !property.startsWith('--') &&
      !Object.hasOwn(unitless, unprefixed) &&
      unprefixed !== 'lineClamp' &&
      unprefixed !== 'gridArea';
    lines.push(`${cssProperty}: ${value}${needsPx ? 'px' : ''};`);
  }
  return lines.join('\n');
}

export const CssToJsBoxSource = {
  defaultDisabled: true,
  name: 'CSS to JS',
  description:
    'Convert CSS declarations and literal React style objects. JS expressions and !important are not supported.',
  defaultInput: 'background-color: red;\nfont-size: 14px;\n::cssjs',
  tag: '#',
  kind: 'Convert',

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'cssjs', 'csstojs')) return [];
    if (input.length > MAX_INPUT) {
      return [
        errorBox('CSS to JS', 'Input must be at most 100,000 characters.'),
      ];
    }
    const text = input.trim();
    if (!text) return [];
    const reverse = text.startsWith('{');
    try {
      const output = reverse ? jsToCss(text) : cssToJs(text);
      if (!output) return [];
      return [
        new BoxBuilder(reverse ? 'JS to CSS' : 'CSS to JS', output)
          .setOptions({ language: reverse ? 'css' : 'javascript' })
          .setView('code')
          .build(),
      ];
    } catch (error) {
      return [
        errorBox(
          reverse ? 'JS to CSS' : 'CSS to JS',
          error instanceof Error ? error.message : 'Invalid style input.',
        ),
      ];
    }
  },
};

export default CssToJsBoxSource;
