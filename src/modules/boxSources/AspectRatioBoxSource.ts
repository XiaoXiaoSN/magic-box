import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// common aspect ratio names keyed by simplified ratio string
const CommonRatios: Record<string, string> = {
  '16:9': '16:9 Widescreen',
  '4:3': '4:3 Standard',
  '21:9': '21:9 Ultrawide',
  '1:1': '1:1 Square',
  '3:2': '3:2 Classic',
  '16:10': '16:10 Widescreen',
};

function gcd(a: number, b: number): number {
  while (b !== 0) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
}

export const AspectRatioBoxSource = {
  name: 'Aspect Ratio',
  description:
    'Simplify width x height into an aspect ratio (e.g. 1920x1080 → 16:9).',
  defaultInput: '1920x1080 ::ratio',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'ratio', 'aspect')) return [];

    const match = trim(input).match(/^(\d+)\s*[x:×]\s*(\d+)$/i);
    if (!match) return [];

    const w = Number.parseInt(match[1], 10);
    const h = Number.parseInt(match[2], 10);
    if (w <= 0 || h <= 0) return [];

    const divisor = gcd(w, h);
    const rw = w / divisor;
    const rh = h / divisor;
    const ratioStr = `${rw}:${rh}`;

    // round to 4 significant digits and strip trailing zeros
    const decimal = Number((w / h).toPrecision(4)).toString();

    const kvOptions: Record<string, string> = {
      Ratio: ratioStr,
      Decimal: decimal,
    };

    const commonName = CommonRatios[ratioStr];
    if (commonName) {
      kvOptions.Common = commonName;
    }

    const plaintextOutput = Object.entries(kvOptions)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    return [
      new BoxBuilder('Aspect Ratio', plaintextOutput)
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(kvOptions)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default AspectRatioBoxSource;
