import { CodeBoxTemplate } from '@components/BoxTemplate';
import { isString } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// well-known invisible/zero-width character metadata
const INVISIBLE_CHARS: Map<number, string> = new Map([
  [0x00a0, 'NO-BREAK SPACE'],
  [0x00ad, 'SOFT HYPHEN'],
  [0x200b, 'ZERO WIDTH SPACE'],
  [0x200c, 'ZERO WIDTH NON-JOINER'],
  [0x200d, 'ZERO WIDTH JOINER'],
  [0x2060, 'WORD JOINER'],
  [0x2000, 'EN QUAD'],
  [0x2001, 'EM QUAD'],
  [0x2002, 'EN SPACE'],
  [0x2003, 'EM SPACE'],
  [0x2004, 'THREE-PER-EM SPACE'],
  [0x2005, 'FOUR-PER-EM SPACE'],
  [0x2006, 'SIX-PER-EM SPACE'],
  [0x2007, 'FIGURE SPACE'],
  [0x2008, 'PUNCTUATION SPACE'],
  [0x2009, 'THIN SPACE'],
  [0x200a, 'HAIR SPACE'],
  [0x202f, 'NARROW NO-BREAK SPACE'],
  [0x205f, 'MEDIUM MATHEMATICAL SPACE'],
  [0x3000, 'IDEOGRAPHIC SPACE'],
  [0xfeff, 'BYTE ORDER MARK'],
]);

// format a code point as U+XXXX with at least 4 hex digits
function toUPlus(cp: number): string {
  return `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;
}

// get a display name for a code point
function charName(cp: number): string {
  const known = INVISIBLE_CHARS.get(cp);
  if (known) return known;
  // control chars below 0x20 (excluding normal whitespace \t \n \r)
  return `CONTROL CHAR`;
}

// returns true if a code point should be flagged as invisible/hidden
function isInvisible(cp: number): boolean {
  // allow normal whitespace
  if (cp === 0x09 || cp === 0x0a || cp === 0x0d) return false;
  // flag control chars below 0x20
  if (cp < 0x20) return true;
  // allow normal printable ASCII (0x20-0x7e)
  if (cp >= 0x20 && cp <= 0x7e) return false;
  // flag DEL and the C1 control block (common homograph-attack injects)
  if (cp === 0x7f || (cp >= 0x80 && cp <= 0x9f)) return true;
  // flag all specifically listed invisible unicode chars
  if (INVISIBLE_CHARS.has(cp)) return true;
  return false;
}

export const InvisibleCharsBoxSource = {
  defaultDisabled: true,
  name: 'Invisible Characters',
  description:
    'Detect and reveal hidden/invisible characters (zero-width, non-breaking space, BOM, etc.).',
  defaultInput: 'hello​world ::invisibles',
  tag: '#',
  kind: 'Analyze',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'invisibles', 'hiddenchars')) return [];
    if (!isString(input) || input.length === 0 || input.length > MAX_INPUT)
      return [];

    // scan input by unicode code point
    const counts = new Map<number, number>();
    let revealed = '';

    for (const char of input) {
      const cp = char.codePointAt(0) as number;
      if (isInvisible(cp)) {
        const token = toUPlus(cp);
        counts.set(cp, (counts.get(cp) ?? 0) + 1);
        revealed += `[${token}]`;
      } else {
        revealed += char;
      }
    }

    if (counts.size === 0) {
      const box = new BoxBuilder(
        'Invisible Characters',
        'No invisible characters found.',
      )
        .setTemplate(CodeBoxTemplate)
        .setPriority(this.priority)
        .build();
      return [box];
    }

    // build header: one line per distinct flagged char
    const headerLines: string[] = [];
    for (const [cp, count] of counts) {
      const uplus = toUPlus(cp);
      const name = charName(cp);
      headerLines.push(`${name} (${uplus}): ${count}`);
    }

    const output = [...headerLines, '', revealed].join('\n');

    const box = new BoxBuilder('Invisible Characters', output)
      .setTemplate(CodeBoxTemplate)
      .setShowExpandButton(true)
      .setPriority(this.priority)
      .build();

    return [box];
  },
};

export default InvisibleCharsBoxSource;
