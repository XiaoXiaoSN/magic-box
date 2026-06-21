import { CodeBoxTemplate } from '@components/BoxTemplate';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';
import { parse } from 'yaml';

const Priority = 10;
const MAX_INPUT = 100_000;

// matches a leading YAML frontmatter block delimited by --- lines
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export const FrontmatterBoxSource = {
  name: 'Frontmatter',
  description:
    'Extract YAML frontmatter (--- delimited) from a Markdown document as JSON.',
  defaultInput: '---\ntitle: Hello\ntags: [a, b]\n---\n# Body ::frontmatter',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'frontmatter', 'fm')) return [];
    if (input.length > MAX_INPUT) return [];

    // strip a leading BOM or blank lines before the opening ---
    const normalized = input.replace(/^﻿/, '').replace(/^\n+/, '');

    const match = FRONTMATTER_RE.exec(normalized);
    if (!match) {
      return [
        new BoxBuilder('Frontmatter', 'No frontmatter found in the document.')
          .setTemplate(CodeBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const yamlBlock = match[1];
    let parsed: unknown;
    try {
      parsed = parse(yamlBlock);
    } catch {
      return [
        new BoxBuilder(
          'Frontmatter',
          'Invalid YAML frontmatter: could not be parsed.',
        )
          .setTemplate(CodeBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const json = JSON.stringify(parsed, null, 2);
    return [
      new BoxBuilder('Frontmatter', json)
        .setOptions({ language: 'json' })
        .setTemplate(CodeBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default FrontmatterBoxSource;
