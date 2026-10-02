import { CodeBoxTemplate } from '@components/BoxTemplate';
import { cheatSheets, cheatSheetTopics } from '@functions/cheatSheets';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys, hasOptionKeys } from '@modules/Box';

export const CheatSheetBoxSource = {
  name: 'Cheat Sheet',
  description:
    'Offline command examples. Enter curl, cheat:git, or ::cheat=jq.',
  defaultInput: 'curl',
  tag: '$',
  kind: 'Reference',
  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const explicit = hasOptionKeys(options, 'cheat', 'cheatsheet');
    const option = extractOptionKeys(options, 'cheat', 'cheatsheet');
    const prefix = /^cheat:\s*(.*)$/i.exec(input.trim());
    const query = (typeof option === 'string' ? option : (prefix?.[1] ?? input))
      .trim()
      .toLowerCase();
    // `cul` is the shorthand used in the original feature request.
    const topic = query === 'cul' ? 'curl' : query;
    const sheet = Object.hasOwn(cheatSheets, topic)
      ? cheatSheets[topic]
      : undefined;
    if (!sheet && !explicit && !prefix) return [];
    const output =
      sheet ??
      `No bundled cheat sheet for "${query}".\nAvailable topics: ${cheatSheetTopics.join(', ')}.\nUse cheat:<topic> or ::cheat=<topic>.`;
    return [
      new BoxBuilder(sheet ? `Cheat Sheet: ${topic}` : 'Cheat Sheet', output)
        .setTemplate(CodeBoxTemplate)
        .setOptions({ language: 'plaintext' })
        .build(),
    ];
  },
};

export default CheatSheetBoxSource;
