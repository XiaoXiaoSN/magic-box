import { CodeBoxTemplate } from '@components/BoxTemplate';
import { isString, trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// maps uppercase letters and digits to their NATO phonetic code words
const NATO_MAP: Record<string, string> = {
  A: 'Alfa',
  B: 'Bravo',
  C: 'Charlie',
  D: 'Delta',
  E: 'Echo',
  F: 'Foxtrot',
  G: 'Golf',
  H: 'Hotel',
  I: 'India',
  J: 'Juliett',
  K: 'Kilo',
  L: 'Lima',
  M: 'Mike',
  N: 'November',
  O: 'Oscar',
  P: 'Papa',
  Q: 'Quebec',
  R: 'Romeo',
  S: 'Sierra',
  T: 'Tango',
  U: 'Uniform',
  V: 'Victor',
  W: 'Whiskey',
  X: 'X-ray',
  Y: 'Yankee',
  Z: 'Zulu',
  '0': 'Zero',
  '1': 'One',
  '2': 'Two',
  '3': 'Three',
  '4': 'Four',
  '5': 'Five',
  '6': 'Six',
  '7': 'Seven',
  '8': 'Eight',
  '9': 'Nine',
};

// converts each character to its NATO phonetic token or a fallback
function toNatoPhonetic(input: string): string {
  return Array.from(input)
    .map((ch) => {
      if (ch === ' ') return '(space)';
      const code = NATO_MAP[ch.toUpperCase()];
      return code ?? ch;
    })
    .join(' ');
}

export const NatoPhoneticBoxSource = {
  name: 'NATO Phonetic',
  description:
    'Spell text using the NATO phonetic alphabet (Alfa, Bravo, Charlie ...).',
  defaultInput: 'AB12 ::nato',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'nato')) return [];
    if (
      !isString(input) ||
      trim(input).length === 0 ||
      input.length > MAX_INPUT
    )
      return [];

    const output = toNatoPhonetic(input);

    return [
      new BoxBuilder('NATO Phonetic', output)
        .setTemplate(CodeBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default NatoPhoneticBoxSource;
