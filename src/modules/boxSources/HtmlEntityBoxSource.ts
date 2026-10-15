import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, errorBox, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const BoxName = 'HTML Entities';
const MAX_INPUT_LENGTH = 100 * 1024;
const ENTITY_CANDIDATE = /&(?:#(?:[xX][\da-fA-F]+|\d+)|[a-zA-Z][a-zA-Z\d]*);/;
const COMPLETE_ENTITY = /&(?:#(?:[xX][\da-fA-F]+|\d+)|[a-zA-Z][a-zA-Z\d]*);/g;
const BASIC_ENTITIES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function encodeHtml(input: string, all: boolean): string {
  let output = '';
  for (const character of input) {
    const basic = BASIC_ENTITIES[character];
    if (basic !== undefined) {
      output += basic;
      continue;
    }

    const codePoint = character.codePointAt(0);
    if (all && codePoint !== undefined && codePoint > 0x7f) {
      const numericValue =
        codePoint >= 0xd800 && codePoint <= 0xdfff ? 0xfffd : codePoint;
      output += `&#x${numericValue.toString(16).toUpperCase()};`;
    } else {
      output += character;
    }
  }
  return output;
}

function resultBox(name: string, output: string): Box {
  return new BoxBuilder(name, output)
    .setView('code')
    .setShowExpandButton(false)
    .setPriority(Priority)
    .build();
}

export const HtmlEntityBoxSource = {
  defaultDisabled: true,
  name: BoxName,
  description:
    'Decode HTML5 character references without parsing markup, or encode text with ::htmlencode (add =all to encode non-ASCII characters).',
  defaultInput: '&amp;lt; &#x1F600;\n::htmldecode',
  tag: '&',
  kind: 'Encode',
  priority: Priority,

  canHandle(input: string, options: BoxOptions): boolean {
    if (hasOptionKeys(options, 'htmlencode', 'htmldecode')) return true;
    return input.length <= MAX_INPUT_LENGTH && ENTITY_CANDIDATE.test(input);
  },

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const encodeRequested = hasOptionKeys(options, 'htmlencode');
    const decodeRequested = hasOptionKeys(options, 'htmldecode');
    const autoDecode =
      !encodeRequested && !decodeRequested && ENTITY_CANDIDATE.test(input);
    if (!encodeRequested && !decodeRequested && !autoDecode) return [];
    if (input.length > MAX_INPUT_LENGTH) {
      return [
        errorBox(BoxName, 'HTML Entities supports input up to 100 KiB.', {
          priority: this.priority,
        }),
      ];
    }

    const mode = options?.htmlencode;
    if (
      encodeRequested &&
      typeof mode === 'string' &&
      (mode.length > 32 || mode.toLowerCase() !== 'all')
    ) {
      return [
        errorBox(
          BoxName,
          `Unknown htmlencode mode. Use ::htmlencode or ::htmlencode=all.`,
          { priority: this.priority },
        ),
      ];
    }

    const boxes: Box[] = [];
    if (decodeRequested || autoDecode) {
      const { decodeHTML, decodeHTMLStrict } = await import('entities/decode');
      const protectedInput = decodeRequested
        ? input.replace(COMPLETE_ENTITY, (entity) =>
            decodeHTMLStrict(entity) === entity
              ? `&amp;${entity.slice(1)}`
              : entity,
          )
        : input;
      const decoded = decodeRequested
        ? decodeHTML(protectedInput)
        : decodeHTMLStrict(input);
      if (decodeRequested || decoded !== input) {
        boxes.push(resultBox('HTML Decode', decoded));
      }
    }

    if (encodeRequested) {
      boxes.push(
        resultBox(
          'HTML Encode',
          encodeHtml(
            input,
            typeof mode === 'string' && mode.toLowerCase() === 'all',
          ),
        ),
      );
    }
    return boxes;
  },
};

export default HtmlEntityBoxSource;
