import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const DEFAULT_BASE = 16;

// round to ~10 sig figs and strip trailing zeros without leaking scientific
// notation (Number().toString() renormalizes e.g. 1e10 → "10000000000")
function formatNumber(n: number): string {
  return Number(n.toPrecision(10)).toString();
}

export const PxRemBoxSource = {
  defaultDisabled: true,
  name: 'px / rem',
  description:
    'Convert between px and rem given a root font size (default 16). e.g. "24px ::pxrem" or "1.5rem ::pxrem".',
  defaultInput: '24px ::pxrem',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'pxrem', 'rempx')) return [];

    // resolve base font size from option value, falling back to DEFAULT_BASE
    const rawBase = extractOptionKeys(options, 'pxrem', 'rempx');
    const base =
      typeof rawBase === 'string' && rawBase !== ''
        ? Number.parseFloat(rawBase)
        : DEFAULT_BASE;
    if (!Number.isFinite(base) || base <= 0) return [];

    const trimmed = trim(input);
    const match = /^(-?\d+(?:\.\d+)?)\s*(px|rem)?$/i.exec(trimmed);
    if (!match) return [];

    const value = Number.parseFloat(match[1]);
    const unit = (match[2] ?? 'px').toLowerCase();

    let pxValue: number;
    let remValue: number;

    if (unit === 'rem') {
      remValue = value;
      pxValue = value * base;
    } else {
      // treat unitless or explicit px as px
      pxValue = value;
      remValue = value / base;
    }

    return [
      new BoxBuilder('px / rem', formatNumber(pxValue))
        .setOptions({
          px: formatNumber(pxValue),
          rem: formatNumber(remValue),
          Base: `${formatNumber(base)}px`,
        })
        .setTemplate(KeyValueBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default PxRemBoxSource;
