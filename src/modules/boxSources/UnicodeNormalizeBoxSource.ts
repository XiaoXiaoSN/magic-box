import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { isString } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// the four standard Unicode normalization forms
const FORMS = ['NFC', 'NFD', 'NFKC', 'NFKD'] as const;
type NormalizationForm = (typeof FORMS)[number];

export const UnicodeNormalizeBoxSource = {
  name: 'Unicode Normalize',
  description:
    'Normalize text to all four Unicode forms (NFC, NFD, NFKC, NFKD).',
  defaultInput: 'ﬁ café ::normalize',
  tag: '#',
  kind: 'Transform',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'normalize', 'unicodenormalize')) return [];
    if (!isString(input) || input.length === 0 || input.length > MAX_INPUT)
      return [];

    const normalized: Record<NormalizationForm, string> = {
      NFC: input.normalize('NFC'),
      NFD: input.normalize('NFD'),
      NFKC: input.normalize('NFKC'),
      NFKD: input.normalize('NFKD'),
    };

    return [
      new BoxBuilder('Unicode Normalize', '')
        .setOptions(normalized)
        .setTemplate(KeyValueBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default UnicodeNormalizeBoxSource;
