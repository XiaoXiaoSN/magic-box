import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { isString, trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// regex that matches pure integers and decimals (no leading sign other than minus)
const NUMBER_RE = /^-?\d+(\.\d+)?$/;

// format a single token for use inside a SQL IN list
function formatToken(token: string): string {
  if (NUMBER_RE.test(token)) {
    return token;
  }
  // escape embedded single-quotes by doubling them
  return `'${token.replaceAll("'", "''")}'`;
}

export const SqlInBoxSource = {
  name: 'SQL IN Clause',
  description:
    'Turn a list of values (newline/comma separated) into a SQL IN (...) clause.',
  defaultInput: 'apple\nbanana\ncherry ::sqlin',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'sqlin')) return [];
    if (
      !isString(input) ||
      trim(input).length === 0 ||
      input.length > MAX_INPUT
    )
      return [];

    const items = trim(input)
      .split(/[\n,]+/)
      .map((item) => trim(item))
      .filter((item) => item.length > 0);

    if (items.length === 0) return [];

    const clause = `IN (${items.map(formatToken).join(', ')})`;

    return [
      new BoxBuilder('SQL IN Clause', clause)
        .setTemplate(DefaultBoxTemplate)
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default SqlInBoxSource;
