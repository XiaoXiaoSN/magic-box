import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const DEFAULT_WORD_COUNT = 4;
const MIN_WORD_COUNT = 2;
const MAX_WORD_COUNT = 20;
const SEPARATOR = '-';

// built-in wordlist of 256 short common English words (3–6 letters, lowercase, no duplicates)
export const WORDLIST: readonly string[] = [
  'able',
  'acid',
  'aged',
  'also',
  'area',
  'army',
  'away',
  'baby',
  'back',
  'ball',
  'band',
  'bank',
  'base',
  'bath',
  'bear',
  'beat',
  'been',
  'bell',
  'best',
  'bird',
  'bite',
  'blow',
  'blue',
  'body',
  'bold',
  'bone',
  'book',
  'born',
  'both',
  'bowl',
  'bulk',
  'burn',
  'busy',
  'buzz',
  'call',
  'calm',
  'came',
  'camp',
  'card',
  'care',
  'case',
  'cash',
  'cast',
  'cave',
  'cell',
  'chat',
  'chip',
  'city',
  'clap',
  'clay',
  'clip',
  'club',
  'clue',
  'coal',
  'coat',
  'code',
  'coil',
  'coin',
  'cold',
  'come',
  'cook',
  'cool',
  'cord',
  'core',
  'cost',
  'crop',
  'cube',
  'cure',
  'curl',
  'cute',
  'dark',
  'data',
  'date',
  'dawn',
  'days',
  'dead',
  'deal',
  'dear',
  'deep',
  'desk',
  'diet',
  'dirt',
  'dish',
  'disk',
  'dock',
  'does',
  'done',
  'door',
  'dose',
  'down',
  'draw',
  'drew',
  'drop',
  'drum',
  'dual',
  'dull',
  'dusk',
  'dust',
  'duty',
  'each',
  'earn',
  'east',
  'easy',
  'edge',
  'else',
  'even',
  'ever',
  'exam',
  'face',
  'fact',
  'fail',
  'fair',
  'fall',
  'farm',
  'fast',
  'fate',
  'feed',
  'feel',
  'feet',
  'fell',
  'felt',
  'file',
  'fill',
  'film',
  'find',
  'fine',
  'fire',
  'firm',
  'fish',
  'fist',
  'flag',
  'flat',
  'flew',
  'flip',
  'flow',
  'foam',
  'fold',
  'folk',
  'fond',
  'font',
  'food',
  'fool',
  'foot',
  'ford',
  'fork',
  'form',
  'fort',
  'foul',
  'four',
  'free',
  'from',
  'fuel',
  'full',
  'fund',
  'fuse',
  'gain',
  'game',
  'gate',
  'gave',
  'gear',
  'gift',
  'glad',
  'glow',
  'glue',
  'goal',
  'goes',
  'gold',
  'golf',
  'gone',
  'good',
  'grab',
  'gray',
  'grew',
  'grid',
  'grin',
  'grip',
  'grow',
  'gulf',
  'gust',
  'hack',
  'half',
  'hall',
  'halt',
  'hand',
  'hang',
  'hard',
  'harm',
  'harp',
  'hash',
  'hate',
  'have',
  'head',
  'heal',
  'heap',
  'heat',
  'heel',
  'held',
  'help',
  'hide',
  'high',
  'hill',
  'hint',
  'hire',
  'hold',
  'hole',
  'home',
  'hook',
  'hope',
  'horn',
  'host',
  'hour',
  'hunt',
  'hurt',
  'icon',
  'idea',
  'idle',
  'iris',
  'item',
  'join',
  'jump',
  'just',
  'keen',
  'keep',
  'kind',
  'king',
  'knew',
  'knot',
  'know',
  'lake',
  'lamp',
  'land',
  'lane',
  'last',
  'late',
  'lawn',
  'lead',
  'leaf',
  'lean',
  'left',
  'lend',
  'lens',
  'less',
  'lift',
  'like',
  'lime',
  'line',
  'link',
  'list',
  'live',
  'load',
  'lock',
  'loft',
  'long',
  'loop',
  'lore',
  'lost',
  'loud',
] as const;

// convert a key-value record to plaintext lines for box plaintextOutput
function kvToPlaintext(kv: Record<string, string>): string {
  return Object.entries(kv)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

/** picks count unbiased random indices into WORDLIST using rejection sampling with a power-of-2 mask */
function pickWords(count: number): string[] {
  const size = WORDLIST.length;

  // find the smallest power of 2 >= size for efficient rejection sampling
  let mask = 1;
  while (mask < size) mask <<= 1;
  mask -= 1;

  const words: string[] = [];
  while (words.length < count) {
    const batch = new Uint32Array(
      count - words.length + 8,
    ) as Uint32Array<ArrayBuffer>;
    crypto.getRandomValues(batch);
    for (const raw of batch) {
      if (words.length >= count) break;
      const idx = raw & mask;
      if (idx < size) {
        words.push(WORDLIST[idx]);
      }
    }
  }
  return words;
}

export const PassphraseBoxSource = {
  name: 'Passphrase',
  description:
    'Generate a memorable passphrase from a wordlist (crypto-secure). ::passphrase=<wordCount> (default 4).',
  defaultInput: ' ::passphrase',
  tag: '#',
  kind: 'Generate',
  priority: Priority,

  async generateBoxes(
    _input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'passphrase', 'diceware')) return [];

    // secure-context guard: crypto.getRandomValues must be available
    if (
      typeof crypto === 'undefined' ||
      typeof crypto.getRandomValues !== 'function'
    ) {
      const errKv = {
        Error:
          'A secure context (HTTPS or localhost) is required for crypto.getRandomValues.',
      };
      return [
        new BoxBuilder('Passphrase', kvToPlaintext(errKv))
          .setTemplate(KeyValueBoxTemplate)
          .setOptions(errKv)
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      ];
    }

    // parse word count from option value, default 4, clamp 2..20
    const optVal = extractOptionKeys(options, 'passphrase', 'diceware');
    let count = DEFAULT_WORD_COUNT;
    if (typeof optVal === 'string' && optVal !== '') {
      const parsed = Number.parseInt(optVal, 10);
      if (!Number.isNaN(parsed)) {
        count = Math.min(MAX_WORD_COUNT, Math.max(MIN_WORD_COUNT, parsed));
      }
    }

    const words = pickWords(count);
    const passphrase = words.join(SEPARATOR);
    const size = WORDLIST.length;
    const entropy = (count * Math.log2(size)).toFixed(1);

    const kv: Record<string, string> = {
      Passphrase: passphrase,
      Words: count.toString(),
      'Wordlist Size': size.toString(),
      'Entropy (bits)': entropy,
    };

    return [
      new BoxBuilder('Passphrase', kvToPlaintext(kv))
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(kv)
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default PassphraseBoxSource;
