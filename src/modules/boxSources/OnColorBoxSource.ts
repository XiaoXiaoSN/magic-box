import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import {
  BLACK,
  contrastRatio,
  formatRatio,
  parseHexColor,
  WHITE,
} from '@functions/color';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { errorBox, hasOptionKeys, keyValueBox } from '@modules/Box';

const Priority = 10;
const MAX_HEX_INPUT = 32;

export const OnColorBoxSource = {
  defaultDisabled: true,
  name: 'Readable Text Color',
  description:
    'Given a background hex color, pick the readable foreground (black or white) and the WCAG contrast.',
  defaultInput: '#3498db ::oncolor',
  tag: '#',
  kind: 'Analyze',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'oncolor', 'textcolor')) return [];

    const raw = trim(input).slice(0, MAX_HEX_INPUT);
    const parsed = parseHexColor(raw);

    if (!parsed) {
      return [
        errorBox(
          'Readable Text Color',
          'A valid hex color is required (e.g. #3498db or #fff)',
          { priority: Priority },
        ),
      ];
    }

    // pick whichever of black/white yields the higher WCAG contrast
    const blackRatio = contrastRatio(parsed, BLACK);
    const whiteRatio = contrastRatio(parsed, WHITE);
    const foreground = blackRatio >= whiteRatio ? '#000000' : '#ffffff';
    const ratio = Math.max(blackRatio, whiteRatio);

    const kvOptions: Record<string, string> = {
      Background: parsed.normalized,
      Foreground: foreground,
      Contrast: formatRatio(ratio),
      'WCAG AA': ratio >= 4.5 ? 'pass' : 'fail',
      'WCAG AAA': ratio >= 7 ? 'pass' : 'fail',
    };

    return [
      keyValueBox(KeyValueBoxTemplate, 'Readable Text Color', kvOptions, {
        priority: Priority,
      }),
    ];
  },
};

export default OnColorBoxSource;
