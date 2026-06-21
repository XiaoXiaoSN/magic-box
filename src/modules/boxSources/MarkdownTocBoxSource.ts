import { CodeBoxTemplate } from '@components/BoxTemplate';
import { isString } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// heading pattern: one to six # chars followed by at least one space and text
const HEADING_RE = /^(#{1,6})\s+(.+)$/;

// fence delimiter pattern: opening ``` or ~~~ (with optional language tag)
const FENCE_OPEN_RE = /^(`{3,}|~{3,})/;

/** converts heading text to a github-compatible anchor slug */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-');
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

  for (const line of input.split('\n')) {
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
      fenceChar = fenceMatch[1][0].repeat(3); // normalize to 3 chars of the same type
      continue;
    }

    const headingMatch = HEADING_RE.exec(line);
    if (headingMatch) {
      const rawText = headingMatch[2];
      // strip trailing # characters and whitespace (setext-style closers)
      const text = rawText.replace(/\s+#+\s*$/, '').trim();
      headings.push({ level: headingMatch[1].length, text });
    }
  }

  return headings;
}

/** builds the nested bullet list string with github-style duplicate slug disambiguation */
function buildToc(headings: Heading[]): string {
  const minLevel = Math.min(...headings.map((h) => h.level));
  const slugCount: Record<string, number> = {};
  const lines: string[] = [];

  for (const { level, text } of headings) {
    const baseSlug = slugify(text);
    const count = slugCount[baseSlug] ?? 0;
    slugCount[baseSlug] = count + 1;

    // first occurrence uses the base slug; subsequent ones append -1, -2, …
    const slug = count === 0 ? baseSlug : `${baseSlug}-${count}`;
    const indent = ' '.repeat((level - minLevel) * 2);
    lines.push(`${indent}- [${text}](#${slug})`);
  }

  return lines.join('\n');
}

export const MarkdownTocBoxSource = {
  name: 'Markdown TOC',
  description:
    'Generate a table of contents (nested bullet list with anchor links) from Markdown headings.',
  defaultInput: '# Title\n## Section A\n### Sub\n## Section B ::toc',
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
          .setTemplate(CodeBoxTemplate)
          .setOptions({ language: 'markdown' })
          .setPriority(this.priority)
          .build(),
      ];
    }

    const toc = buildToc(headings);
    return [
      new BoxBuilder('Markdown TOC', toc)
        .setTemplate(CodeBoxTemplate)
        .setOptions({ language: 'markdown' })
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default MarkdownTocBoxSource;
