import { CodeBoxTemplate } from '@components/BoxTemplate';
import { isString, trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// characters that NFD decomposition does not handle — mapped to their ASCII equivalents
const SPECIAL_CHAR_MAP: Record<string, string> = {
  ø: 'o',
  Ø: 'O',
  ß: 'ss',
  æ: 'ae',
  Æ: 'AE',
  œ: 'oe',
  Œ: 'OE',
  đ: 'd',
  Đ: 'D',
  ł: 'l',
  Ł: 'L',
  ð: 'd',
  þ: 'th',
};

const SPECIAL_CHAR_REGEX = new RegExp(
  `[${Object.keys(SPECIAL_CHAR_MAP).join('')}]`,
  'g',
);

// strips combining diacritical marks (U+0300–U+036F) after NFD normalization,
// then substitutes characters NFD cannot decompose
function removeAccents(input: string): string {
  const nfdStripped = input.normalize('NFD').replace(/[̀-ͯ]/g, '');
  return nfdStripped.replace(
    SPECIAL_CHAR_REGEX,
    (ch) => SPECIAL_CHAR_MAP[ch] ?? ch,
  );
}

export const UnaccentBoxSource = {
  defaultDisabled: true,
  name: 'Remove Accents',
  description:
    'Strip diacritics/accents from text (café → cafe). ::unaccent or ::deburr.',
  defaultInput: 'Crème brûlée ::unaccent',
  tag: '#',
  kind: 'Transform',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'unaccent', 'deburr', 'removeaccents')) {
      return [];
    }
    if (
      !isString(input) ||
      trim(input).length === 0 ||
      input.length > MAX_INPUT
    ) {
      return [];
    }

    const result = removeAccents(input);
    return [
      new BoxBuilder('Remove Accents', result)
        .setTemplate(CodeBoxTemplate)
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default UnaccentBoxSource;
