import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { contrastRatio, formatRatio, parseHexColor } from '@functions/color';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { errorBox, hasOptionKeys, keyValueBox } from '@modules/Box';

const Priority = 10;

const passOrFail = (ratio: number, threshold: number): string =>
  ratio >= threshold ? 'pass' : 'fail';

export const ColorContrastBoxSource = {
  defaultDisabled: true,
  name: 'Color Contrast',
  description:
    'WCAG contrast ratio between two hex colors (space- or newline-separated).',
  defaultInput: '#000000 #ffffff ::contrast',
  tag: '#',
  kind: 'Analyze',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'contrast')) return [];

    const parts = trim(input).split(/\s+/).filter(Boolean);

    // when not exactly two tokens, return an explanatory box
    if (parts.length !== 2) {
      return [
        errorBox(
          'Color Contrast',
          'two hex colors required (e.g. #000000 #ffffff)',
          { priority: Priority },
        ),
      ];
    }

    const color1 = parseHexColor(parts[0]);
    const color2 = parseHexColor(parts[1]);

    if (color1 === null || color2 === null) {
      return [
        errorBox(
          'Color Contrast',
          'invalid hex color — use #RGB or #RRGGBB format',
          { priority: Priority },
        ),
      ];
    }

    const ratio = contrastRatio(color1, color2);

    const kvOptions: Record<string, string> = {
      Ratio: formatRatio(ratio),
      'AA Normal': passOrFail(ratio, 4.5),
      'AA Large': passOrFail(ratio, 3),
      'AAA Normal': passOrFail(ratio, 7),
      'AAA Large': passOrFail(ratio, 4.5),
    };

    return [
      keyValueBox(KeyValueBoxTemplate, 'Color Contrast', kvOptions, {
        priority: Priority,
      }),
    ];
  },
};

export default ColorContrastBoxSource;
