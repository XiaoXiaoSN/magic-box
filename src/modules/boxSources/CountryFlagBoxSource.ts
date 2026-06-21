import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// base code point for regional indicator symbols (🇦 = U+1F1E6)
const REGIONAL_INDICATOR_BASE = 0x1f1e6;

// map of ISO 3166-1 alpha-2 codes to country names for the ~50 most common countries
const NAMES: Record<string, string> = {
  AD: 'Andorra',
  AE: 'United Arab Emirates',
  AF: 'Afghanistan',
  AR: 'Argentina',
  AU: 'Australia',
  AT: 'Austria',
  BE: 'Belgium',
  BR: 'Brazil',
  CA: 'Canada',
  CH: 'Switzerland',
  CL: 'Chile',
  CN: 'China',
  CO: 'Colombia',
  CZ: 'Czech Republic',
  DE: 'Germany',
  DK: 'Denmark',
  EG: 'Egypt',
  ES: 'Spain',
  FI: 'Finland',
  FR: 'France',
  GB: 'United Kingdom',
  GR: 'Greece',
  HK: 'Hong Kong',
  HU: 'Hungary',
  ID: 'Indonesia',
  IE: 'Ireland',
  IL: 'Israel',
  IN: 'India',
  IT: 'Italy',
  JP: 'Japan',
  KR: 'South Korea',
  MX: 'Mexico',
  MY: 'Malaysia',
  NL: 'Netherlands',
  NO: 'Norway',
  NZ: 'New Zealand',
  PH: 'Philippines',
  PK: 'Pakistan',
  PL: 'Poland',
  PT: 'Portugal',
  RO: 'Romania',
  RU: 'Russia',
  SA: 'Saudi Arabia',
  SE: 'Sweden',
  SG: 'Singapore',
  TH: 'Thailand',
  TR: 'Turkey',
  TW: 'Taiwan',
  UA: 'Ukraine',
  US: 'United States',
  VN: 'Vietnam',
  ZA: 'South Africa',
};

// converts a 2-letter ISO code (uppercase) to its flag emoji via regional indicator symbols
function codeToFlag(code: string): string {
  const a = code.charCodeAt(0) - 'A'.charCodeAt(0);
  const b = code.charCodeAt(1) - 'A'.charCodeAt(0);
  return String.fromCodePoint(
    REGIONAL_INDICATOR_BASE + a,
    REGIONAL_INDICATOR_BASE + b,
  );
}

// extracts the two regional indicator code points from a flag emoji, returns uppercase 2-letter code or null
function flagToCode(flag: string): string | null {
  const codePoints: number[] = [];
  for (const cp of flag) {
    const n = cp.codePointAt(0) ?? 0;
    if (n >= REGIONAL_INDICATOR_BASE && n <= 0x1f1ff) {
      codePoints.push(n);
    }
  }
  if (codePoints.length !== 2) return null;
  const a = String.fromCharCode(
    codePoints[0] - REGIONAL_INDICATOR_BASE + 'A'.charCodeAt(0),
  );
  const b = String.fromCharCode(
    codePoints[1] - REGIONAL_INDICATOR_BASE + 'A'.charCodeAt(0),
  );
  return a + b;
}

export const CountryFlagBoxSource = {
  name: 'Country Flag',
  description:
    'Convert an ISO 3166-1 alpha-2 country code to its flag emoji, or a flag emoji back to its code.',
  defaultInput: 'US ::flag',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'flag', 'countryflag')) return [];

    const text = trim(input);

    // code → flag path
    if (/^[A-Za-z]{2}$/.test(text)) {
      const code = text.toUpperCase();
      const flag = codeToFlag(code);
      const name = NAMES[code];

      const kv: Record<string, string> = { Code: code, Flag: flag };
      if (name) kv.Name = name;

      const lines = Object.entries(kv)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n');

      return [
        new BoxBuilder('Country Flag', lines)
          .setTemplate(KeyValueBoxTemplate)
          .setOptions(kv)
          .setPriority(this.priority)
          .build(),
      ];
    }

    // flag → code path: check for two regional indicator symbols
    const reverseCode = flagToCode(text);
    if (reverseCode !== null) {
      const flag = text;
      const name = NAMES[reverseCode];

      const kv: Record<string, string> = { Code: reverseCode, Flag: flag };
      if (name) kv.Name = name;

      const lines = Object.entries(kv)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n');

      return [
        new BoxBuilder('Country Flag', lines)
          .setTemplate(KeyValueBoxTemplate)
          .setOptions(kv)
          .setPriority(this.priority)
          .build(),
      ];
    }

    // unrecognized input — explain what is required
    const message =
      'Enter a 2-letter country code (e.g. US) or a flag emoji (e.g. 🇺🇸) with ::flag';

    return [
      new BoxBuilder('Country Flag', message)
        .setTemplate(KeyValueBoxTemplate)
        .setOptions({ Info: message })
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default CountryFlagBoxSource;
