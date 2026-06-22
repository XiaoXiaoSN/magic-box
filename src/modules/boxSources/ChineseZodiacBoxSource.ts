import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// 12 zodiac animals with english and Traditional Chinese names.
// index = ((year - 4) % 12 + 12) % 12, where index 0 = Rat.
// NOTE: this uses the Gregorian year only, not the lunar new year boundary.
// years near late january/early february may belong to the prior animal cycle.
const ANIMALS = [
  { en: 'Rat', zh: '鼠' },
  { en: 'Ox', zh: '牛' },
  { en: 'Tiger', zh: '虎' },
  { en: 'Rabbit', zh: '兔' },
  { en: 'Dragon', zh: '龍' },
  { en: 'Snake', zh: '蛇' },
  { en: 'Horse', zh: '馬' },
  { en: 'Goat', zh: '羊' },
  { en: 'Monkey', zh: '猴' },
  { en: 'Rooster', zh: '雞' },
  { en: 'Dog', zh: '狗' },
  { en: 'Pig', zh: '豬' },
];

// ten heavenly stems (天干), cycling every 10 years
const HEAVENLY_STEMS = [
  '甲',
  '乙',
  '丙',
  '丁',
  '戊',
  '己',
  '庚',
  '辛',
  '壬',
  '癸',
];

// twelve earthly branches (地支), cycling every 12 years
const EARTHLY_BRANCHES = [
  '子',
  '丑',
  '寅',
  '卯',
  '辰',
  '巳',
  '午',
  '未',
  '申',
  '酉',
  '戌',
  '亥',
];

// five elements (五行), paired two stems each: Wood, Fire, Earth, Metal, Water
const ELEMENTS = ['Wood 木', 'Fire 火', 'Earth 土', 'Metal 金', 'Water 水'];

// build a k:v plaintext block from an ordered record
function kvToPlaintext(pairs: Record<string, string>): string {
  return Object.entries(pairs)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

function buildErrorBox(message: string): Box {
  const pairs = { Error: message };
  return new BoxBuilder('Chinese Zodiac', kvToPlaintext(pairs))
    .setTemplate(KeyValueBoxTemplate)
    .setOptions(pairs)
    .setPriority(Priority)
    .build();
}

export const ChineseZodiacBoxSource = {
  name: 'Chinese Zodiac',
  description:
    'Chinese zodiac animal, element, and stem-branch for a year (by Gregorian year).',
  defaultInput: '2024 ::chinesezodiac',
  tag: '#',
  kind: 'Calculate',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'chinesezodiac', 'shengxiao')) return [];

    // prefer a numeric value on the option key itself, else fall back to input
    const optionValue = extractOptionKeys(
      options,
      'chinesezodiac',
      'shengxiao',
    );
    const rawYear =
      typeof optionValue === 'string' && /^\d{1,5}$/.test(optionValue.trim())
        ? optionValue.trim()
        : trim(input);

    if (!/^\d{1,5}$/.test(rawYear)) {
      return [buildErrorBox('A valid Gregorian year (1–99999) is required.')];
    }

    const year = Number.parseInt(rawYear, 10);
    if (year < 1) {
      return [buildErrorBox('Year must be >= 1.')];
    }

    // all indices use the positive-modulo form to handle pre-epoch years correctly
    const stemIdx = (((year - 4) % 10) + 10) % 10;
    const branchIdx = (((year - 4) % 12) + 12) % 12;

    const animal = ANIMALS[branchIdx];
    const elementStr = ELEMENTS[Math.floor(stemIdx / 2)];
    const yinYang = stemIdx % 2 === 0 ? 'Yang 陽' : 'Yin 陰';
    const stemBranch = HEAVENLY_STEMS[stemIdx] + EARTHLY_BRANCHES[branchIdx];

    const pairs: Record<string, string> = {
      Year: rawYear,
      Animal: `${animal.en} ${animal.zh}`,
      Element: elementStr,
      'Yin/Yang': yinYang,
      'Stem-Branch': stemBranch,
    };

    return [
      new BoxBuilder('Chinese Zodiac', kvToPlaintext(pairs))
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(pairs)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default ChineseZodiacBoxSource;
