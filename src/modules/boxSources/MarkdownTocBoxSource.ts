import { isString } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';
import type { MarkdownIt, Token } from 'markdown-it';

const Priority = 10;
const MAX_INPUT = 100_000;

interface Heading {
  level: number;
  text: string;
}

let parserPromise: Promise<MarkdownIt> | null = null;

async function loadMarkdownParser(): Promise<MarkdownIt> {
  if (!parserPromise) {
    parserPromise = import('markdown-it')
      .then(
        // tokenize raw HTML so tags can be omitted without rendering them
        ({ default: MarkdownItParser }) => new MarkdownItParser({ html: true }),
      )
      .catch((error: unknown) => {
        parserPromise = null;
        throw error;
      });
  }
  return parserPromise;
}

function visibleText(tokens: readonly Token[]): string {
  const pending = [...tokens].reverse();
  const visible: string[] = [];

  while (pending.length > 0) {
    const token = pending.pop() as Token;

    if (token.children) {
      for (let index = token.children.length - 1; index >= 0; index--) {
        pending.push(token.children[index]);
      }
    } else if (token.type === 'text' || token.type === 'code_inline') {
      visible.push(token.content);
    } else if (token.type === 'image') {
      visible.push(token.content);
    } else if (token.type === 'softbreak' || token.type === 'hardbreak') {
      visible.push(' ');
    }
  }

  return visible.join('');
}

/** parses top-level ATX headings and resolves their inline markdown */
async function parseHeadings(input: string): Promise<Heading[]> {
  const parser = await loadMarkdownParser();
  const tokens = parser.parse(input, {});
  const headings: Heading[] = [];

  for (let index = 0; index + 1 < tokens.length; index++) {
    const opening = tokens[index];
    const inline = tokens[index + 1];
    if (
      opening.type !== 'heading_open' ||
      opening.level !== 0 ||
      !opening.markup.startsWith('#') ||
      inline.type !== 'inline'
    ) {
      continue;
    }

    headings.push({
      level: Number(opening.tag.slice(1)),
      text: visibleText(inline.children ?? []),
    });
  }

  return headings;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}\s_-]/gu, '')
    .replace(/\s/g, '-');
}

/** builds the nested bullet list string with github-style duplicate slug disambiguation */
function buildToc(headings: Heading[]): string {
  const minLevel = headings.reduce((min, h) => Math.min(min, h.level), 6);
  const nextSuffix = new Map<string, number>();
  const usedSlugs = new Set<string>();
  const lines: string[] = [];

  for (const { level, text } of headings) {
    const baseSlug = slugify(text);
    let slug = baseSlug;

    if (usedSlugs.has(slug)) {
      let suffix = nextSuffix.get(baseSlug) ?? 1;
      do {
        slug = `${baseSlug}-${suffix}`;
        suffix++;
      } while (usedSlugs.has(slug));
      nextSuffix.set(baseSlug, suffix);
    }
    usedSlugs.add(slug);

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

    const headings = await parseHeadings(input);

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
