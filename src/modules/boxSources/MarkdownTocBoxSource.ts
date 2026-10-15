import { isString } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// heading pattern: one to six # chars followed by at least one space and text
const HEADING_RE = /^(#{1,6})\s+(.+)$/;

// fence delimiter pattern: opening ``` or ~~~ (with optional language tag)
const FENCE_OPEN_RE = /^(`{3,}|~{3,})/;

const CODE_DELIMITER = '`';

interface InlineLinks {
  opening: Map<number, number>;
  closing: Map<number, number>;
}

interface EmphasisOpener {
  index: number;
  remaining: number;
}

function isMarkdownEscape(text: string, index: number): boolean {
  if (text[index] !== '\\' || index + 1 === text.length) return false;
  const code = text.charCodeAt(index + 1);
  return (
    code >= 0x21 &&
    code <= 0x7e &&
    !(code >= 0x30 && code <= 0x39) &&
    !(code >= 0x41 && code <= 0x5a) &&
    !(code >= 0x61 && code <= 0x7a)
  );
}

function delimiterRunLength(
  text: string,
  start: number,
  delimiter: string,
): number {
  let end = start + 1;
  while (text[end] === delimiter) end++;
  return end - start;
}

function findCodeSpans(text: string): Map<number, number> {
  const runsByLength = new Map<number, number[]>();

  for (let index = 0; index < text.length; ) {
    if (isMarkdownEscape(text, index)) {
      index += 2;
    } else if (text[index] === CODE_DELIMITER) {
      const runLength = delimiterRunLength(text, index, CODE_DELIMITER);
      const runs = runsByLength.get(runLength) ?? [];
      runs.push(index);
      runsByLength.set(runLength, runs);
      index += runLength;
    } else {
      index++;
    }
  }

  const cursorByLength = new Map<number, number>();
  const spans = new Map<number, number>();
  for (let index = 0; index < text.length; ) {
    if (isMarkdownEscape(text, index)) {
      index += 2;
    } else if (text[index] === CODE_DELIMITER) {
      const runLength = delimiterRunLength(text, index, CODE_DELIMITER);
      const runs = runsByLength.get(runLength);
      let cursor = cursorByLength.get(runLength) ?? 0;
      while (runs && runs[cursor] < index) cursor++;

      if (runs && runs[cursor] === index && cursor + 1 < runs.length) {
        const closing = runs[cursor + 1];
        spans.set(index, closing + runLength);
        cursorByLength.set(runLength, cursor + 2);
        index = closing + runLength;
      } else {
        cursorByLength.set(runLength, cursor + 1);
        index += runLength;
      }
    } else {
      index++;
    }
  }
  return spans;
}

function findInlinePairs(
  text: string,
  codeSpans: Map<number, number>,
): { brackets: Map<number, number>; parentheses: Map<number, number> } {
  const brackets = new Map<number, number>();
  const parentheses = new Map<number, number>();
  const bracketStack: number[] = [];
  const parenthesisStack: number[] = [];

  for (let index = 0; index < text.length; ) {
    const codeEnd = codeSpans.get(index);
    if (codeEnd !== undefined) {
      index = codeEnd;
    } else if (isMarkdownEscape(text, index)) {
      index += 2;
    } else if (text[index] === '[') {
      bracketStack.push(index++);
    } else if (text[index] === ']') {
      const opening = bracketStack.pop();
      if (opening !== undefined) brackets.set(opening, index);
      index++;
    } else if (text[index] === '(') {
      parenthesisStack.push(index++);
    } else if (text[index] === ')') {
      const opening = parenthesisStack.pop();
      if (opening !== undefined) parentheses.set(opening, index);
      index++;
    } else {
      index++;
    }
  }

  return { brackets, parentheses };
}

function findInlineLinks(
  text: string,
  brackets: Map<number, number>,
  parentheses: Map<number, number>,
): InlineLinks {
  const opening = new Map<number, number>();
  const closing = new Map<number, number>();

  for (const [start, end] of brackets) {
    if (text[end + 1] === '(') {
      const destinationEnd = parentheses.get(end + 1);
      if (destinationEnd !== undefined) {
        opening.set(start, destinationEnd);
        closing.set(end, destinationEnd);
      }
    } else if (text[end + 1] === '[') {
      const referenceEnd = brackets.get(end + 1);
      if (referenceEnd !== undefined) {
        opening.set(start, referenceEnd);
        closing.set(end, referenceEnd);
      }
    }
  }
  return { opening, closing };
}

function previousCodePoint(text: string, index: number): string {
  let start = index - 1;
  const code = text.charCodeAt(start);
  if (code >= 0xdc00 && code <= 0xdfff && start > 0) start--;
  return text.slice(start, index);
}

function nextCodePoint(text: string, index: number): string {
  const code = text.codePointAt(index);
  return code === undefined ? '' : String.fromCodePoint(code);
}

function isWhitespace(char: string): boolean {
  return char === '' || /^\s$/u.test(char);
}

function isPunctuation(char: string): boolean {
  return char !== '' && /^[\p{P}\p{S}]$/u.test(char);
}

function findEmphasis(
  text: string,
  codeSpans: Map<number, number>,
  links: InlineLinks,
): Map<number, number> {
  const openers = new Map<string, EmphasisOpener[]>();
  const markers = new Map<number, number>();

  for (let index = 0; index < text.length; ) {
    const codeEnd = codeSpans.get(index);
    if (codeEnd !== undefined) {
      index = codeEnd;
    } else if (isMarkdownEscape(text, index)) {
      index += 2;
    } else if (links.closing.has(index)) {
      index = (links.closing.get(index) ?? index) + 1;
    } else if (
      text[index] === '*' ||
      text[index] === '_' ||
      text[index] === '~'
    ) {
      const delimiter = text[index];
      const length = delimiterRunLength(text, index, delimiter);
      const allowed = delimiter === '~' ? length === 2 : length <= 3;
      if (!allowed) {
        index += length;
        continue;
      }

      const before = previousCodePoint(text, index);
      const after = nextCodePoint(text, index + length);
      const beforeWhitespace = isWhitespace(before);
      const afterWhitespace = isWhitespace(after);
      const beforePunctuation = isPunctuation(before);
      const afterPunctuation = isPunctuation(after);
      const leftFlanking =
        !afterWhitespace &&
        (!afterPunctuation || beforeWhitespace || beforePunctuation);
      const rightFlanking =
        !beforeWhitespace &&
        (!beforePunctuation || afterWhitespace || afterPunctuation);
      const canOpen =
        delimiter === '_'
          ? leftFlanking && (!rightFlanking || beforePunctuation)
          : leftFlanking;
      const canClose =
        delimiter === '_'
          ? rightFlanking && (!leftFlanking || afterPunctuation)
          : rightFlanking;
      let remaining = length;

      if (canClose) {
        const stack = openers.get(delimiter);
        while (remaining > 0 && stack && stack.length > 0) {
          const opening = stack[stack.length - 1];
          const matchedLength =
            delimiter === '~'
              ? 2
              : opening.remaining >= 2 && remaining >= 2
                ? 2
                : 1;

          markers.set(
            opening.index,
            (markers.get(opening.index) ?? 0) + matchedLength,
          );
          markers.set(index, (markers.get(index) ?? 0) + matchedLength);
          opening.remaining -= matchedLength;
          remaining -= matchedLength;
          if (opening.remaining === 0) stack.pop();
        }
      }
      if (canOpen && remaining > 0) {
        const stack = openers.get(delimiter) ?? [];
        stack.push({ index: index + length - remaining, remaining });
        openers.set(delimiter, stack);
      }
      index += length;
    } else {
      index++;
    }
  }
  return markers;
}

function readHtmlTagEnd(text: string, start: number): number | null {
  if (text.startsWith('<!--', start)) {
    for (let index = start + 4; index + 2 < text.length; index++) {
      if (
        text[index] === '-' &&
        text[index + 1] === '-' &&
        text[index + 2] === '>'
      ) {
        return index + 3;
      }
    }
    return -1;
  }

  let index = start + 1;
  if (text[index] === '/' || text[index] === '!' || text[index] === '?') {
    index++;
  }
  const first = text.charCodeAt(index);
  if (!((first >= 0x41 && first <= 0x5a) || (first >= 0x61 && first <= 0x7a))) {
    return null;
  }

  while (index < text.length) {
    const char = text[index];
    if (char === '"' || char === "'") {
      const quote = char;
      index++;
      while (
        index < text.length &&
        text[index] !== quote &&
        text[index] !== '<'
      )
        index++;
      if (text[index] === '<') return null;
      if (index === text.length) return null;
      index++;
    } else if (char === '<') {
      return null;
    } else if (char === '>') {
      return index + 1;
    } else {
      index++;
    }
  }
  return null;
}

function findHtmlTags(
  text: string,
  codeSpans: Map<number, number>,
): Map<number, number> {
  const tags = new Map<number, number>();
  for (let index = 0; index < text.length; ) {
    const codeEnd = codeSpans.get(index);
    if (codeEnd !== undefined) {
      index = codeEnd;
    } else if (isMarkdownEscape(text, index)) {
      index += 2;
    } else if (text[index] === '<') {
      const end = readHtmlTagEnd(text, index);
      if (end === -1) break;
      if (end === null) index++;
      else {
        tags.set(index, end);
        index = end;
      }
    } else {
      index++;
    }
  }
  return tags;
}

/** converts inline markdown to the visible heading text without recursive parsing */
function stripInlineMarkdown(text: string): string {
  const codeSpans = findCodeSpans(text);
  const { brackets, parentheses } = findInlinePairs(text, codeSpans);
  const links = findInlineLinks(text, brackets, parentheses);
  const emphasis = findEmphasis(text, codeSpans, links);
  const htmlTags = findHtmlTags(text, codeSpans);
  let plain = '';

  for (let index = 0; index < text.length; ) {
    const codeEnd = codeSpans.get(index);
    if (codeEnd !== undefined) {
      const runLength = delimiterRunLength(text, index, CODE_DELIMITER);
      plain += text.slice(index + runLength, codeEnd - runLength);
      index = codeEnd;
    } else if (isMarkdownEscape(text, index)) {
      plain += text[index + 1];
      index += 2;
    } else if (text[index] === '!' && links.opening.has(index + 1)) {
      index++;
    } else if (links.opening.has(index)) {
      index++;
    } else if (links.closing.has(index)) {
      index = (links.closing.get(index) ?? index) + 1;
    } else if (emphasis.has(index)) {
      index += emphasis.get(index) ?? 1;
    } else if (htmlTags.has(index)) {
      index = htmlTags.get(index) ?? index + 1;
    } else {
      plain += text[index];
      index++;
    }
  }
  return plain;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}\s_-]/gu, '')
    .replace(/\s/g, '-');
}

interface Heading {
  level: number;
  text: string;
}

/** parses ATX headings from markdown, skipping lines inside fenced code blocks */
function parseHeadings(input: string): Heading[] {
  const headings: Heading[] = [];
  let inFence = false;
  let fenceChar = '';

  for (const line of input.split(/\r?\n/)) {
    if (inFence) {
      // exit fence when we see the matching closing delimiter
      if (line.trimStart().startsWith(fenceChar)) {
        inFence = false;
        fenceChar = '';
      }
      continue;
    }

    const fenceMatch = FENCE_OPEN_RE.exec(line.trimStart());
    if (fenceMatch) {
      inFence = true;
      // keep the exact opening run; a closing fence must be at least as long
      fenceChar = fenceMatch[1];
      continue;
    }

    const headingMatch = HEADING_RE.exec(line);
    if (headingMatch) {
      const rawText = headingMatch[2];
      // strip trailing # characters and whitespace (setext-style closers)
      const text = stripInlineMarkdown(rawText.replace(/\s+#+\s*$/, '').trim());
      headings.push({ level: headingMatch[1].length, text });
    }
  }

  return headings;
}

/** builds the nested bullet list string with github-style duplicate slug disambiguation */
function buildToc(headings: Heading[]): string {
  const minLevel = headings.reduce((min, h) => Math.min(min, h.level), 6);
  const slugCount = new Map<string, number>();
  const lines: string[] = [];

  for (const { level, text } of headings) {
    const baseSlug = slugify(text);
    const count = slugCount.get(baseSlug) ?? 0;
    slugCount.set(baseSlug, count + 1);

    // first occurrence uses the base slug; subsequent ones append -1, -2, …
    const slug = count === 0 ? baseSlug : `${baseSlug}-${count}`;
    const indent = ' '.repeat((level - minLevel) * 2);
    const label = text
      .replace(/([\\[\]])/g, '\\$1')
      .replace(/([*_~<>\x60])/g, '\\$1');
    lines.push(`${indent}- [${label}](#${slug})`);
  }

  return lines.join('\n');
}

export const MarkdownTocBoxSource = {
  defaultDisabled: true,
  name: 'Markdown TOC',
  description:
    'Generate a table of contents (nested bullet list with anchor links) from Markdown headings.',
  defaultInput: '# Title\n## Section A\n### Sub\n## Section B\n::toc',
  tag: '#',
  kind: 'Transform',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'toc', 'tableofcontents')) return [];
    if (!isString(input) || input.length === 0 || input.length > MAX_INPUT)
      return [];

    const headings = parseHeadings(input);

    if (headings.length === 0) {
      return [
        new BoxBuilder('Markdown TOC', 'No headings found.')
          .setView('code')
          .setOptions({ language: 'markdown' })
          .setPriority(this.priority)
          .build(),
      ];
    }

    const toc = buildToc(headings);
    return [
      new BoxBuilder('Markdown TOC', toc)
        .setView('code')
        .setOptions({ language: 'markdown' })
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default MarkdownTocBoxSource;
