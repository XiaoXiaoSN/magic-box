import { CodeBoxTemplate } from '@components/BoxTemplate';
import { isString } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// escapes html special chars in a raw text fragment so the output markup is valid
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// applies inline markdown rules to an already-html-escaped string.
// all regexes use negated character classes ([^...]) to stay linear — no nested quantifiers.
function applyInline(text: string): string {
  // bold: **x** or __x__
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  // italic: *x* or _x_ (after bold so ** is consumed first)
  text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  text = text.replace(/_([^_]+)_/g, '<em>$1</em>');
  // inline code: `x`
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  // links: [text](url) — drop dangerous url schemes so the generated HTML
  // (which the user will paste elsewhere) can't carry a script payload
  text = text.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_m, label: string, url: string) =>
      `<a href="${safeHref(url)}">${label}</a>`,
  );
  return text;
}

// neutralize javascript:/vbscript:/data: hrefs (text is already html-escaped)
function safeHref(url: string): string {
  const scheme = url.trim().toLowerCase();
  if (
    scheme.startsWith('javascript:') ||
    scheme.startsWith('vbscript:') ||
    scheme.startsWith('data:')
  ) {
    return '#unsafe-url-removed';
  }
  return url;
}

// converts a subset of markdown to html source text
function convertMarkdownToHtml(markdown: string): string {
  const lines = markdown.split('\n');
  const output: string[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // fenced code block: ``` ... ```
    if (line.trim() === '```' || line.trim().startsWith('```')) {
      const fence = '```';
      i++;
      const codeLines: string[] = [];
      while (i < lines.length && !lines[i].trim().startsWith(fence)) {
        codeLines.push(escapeHtml(lines[i]));
        i++;
      }
      i++; // skip closing fence
      output.push(`<pre><code>${codeLines.join('\n')}</code></pre>`);
      continue;
    }

    // atx headings: # through ######
    const headingMatch = line.match(/^(#{1,6}) (.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = applyInline(escapeHtml(headingMatch[2]));
      output.push(`<h${level}>${content}</h${level}>`);
      i++;
      continue;
    }

    // unordered list block: lines starting with "- " or "* "
    if (/^[*-] /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[*-] /.test(lines[i])) {
        const itemText = applyInline(
          escapeHtml(lines[i].replace(/^[*-] /, '')),
        );
        items.push(`<li>${itemText}</li>`);
        i++;
      }
      output.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    // ordered list block: lines starting with "N. "
    if (/^\d+\. /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        const itemText = applyInline(
          escapeHtml(lines[i].replace(/^\d+\. /, '')),
        );
        items.push(`<li>${itemText}</li>`);
        i++;
      }
      output.push(`<ol>${items.join('')}</ol>`);
      continue;
    }

    // blank line: separator — skip
    if (line.trim() === '') {
      i++;
      continue;
    }

    // paragraph: collect consecutive non-blank, non-special lines
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^#{1,6} /.test(lines[i]) &&
      !/^[*-] /.test(lines[i]) &&
      !/^\d+\. /.test(lines[i]) &&
      lines[i].trim() !== '```' &&
      !lines[i].trim().startsWith('```')
    ) {
      paraLines.push(applyInline(escapeHtml(lines[i])));
      i++;
    }
    if (paraLines.length > 0) {
      output.push(`<p>${paraLines.join('\n')}</p>`);
    }
  }

  return output.join('\n');
}

export const MarkdownToHtmlBoxSource = {
  defaultDisabled: true,
  name: 'Markdown to HTML',
  description:
    'Convert a subset of Markdown (headings, bold, italic, code, links, lists) to HTML.',
  defaultInput: '# Title\n\nSome **bold** and *italic* and `code`. ::md2html',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'md2html', 'markdownhtml')) return [];
    if (!isString(input) || input.length === 0 || input.length > MAX_INPUT)
      return [];

    const html = convertMarkdownToHtml(input);

    return [
      new BoxBuilder('Markdown to HTML', html)
        .setTemplate(CodeBoxTemplate)
        .setOptions({ language: 'html' })
        .setShowExpandButton(true)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default MarkdownToHtmlBoxSource;
