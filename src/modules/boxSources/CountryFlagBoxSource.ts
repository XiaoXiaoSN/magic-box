import type { Box, BoxOptions } from '@modules/Box';
import { errorBox, hasOptionKeys, keyValueBox } from '@modules/Box';

const REGIONAL_INDICATOR_BASE = 0x1f1e6;
// Assigned ISO 3166-1 alpha-2 codes; reserved and private-use codes are excluded.
const COUNTRY_CODES = new Set(
  'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW' /* codespell:ignore fo */
    .split(' '),
);
const COUNTRY_NAMES = new Intl.DisplayNames(['en'], { type: 'region' });

export const CountryFlagBoxSource = {
  defaultDisabled: true,
  name: 'Country Flag',
  description:
    'Convert an ISO 3166-1 alpha-2 country code to its flag emoji, or a flag emoji back to its code.',
  defaultInput: 'US\n::flag',
  tag: '#',
  kind: 'Convert',

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'flag', 'countryflag')) return [];
    if (input.length > 256) {
      return [
        errorBox('Country Flag', 'Enter one country code or flag emoji.'),
      ];
    }
    const text = input.trim();
    let code = '';
    if (/^[a-z]{2}$/i.test(text)) {
      code = text.toUpperCase();
    } else if (/^[\u{1f1e6}-\u{1f1ff}]{2}$/u.test(text)) {
      code = String.fromCharCode(
        (text.codePointAt(0) as number) - REGIONAL_INDICATOR_BASE + 65,
        (text.codePointAt(2) as number) - REGIONAL_INDICATOR_BASE + 65,
      );
    }
    if (!COUNTRY_CODES.has(code)) {
      return [
        errorBox(
          'Country Flag',
          'Enter an assigned ISO 3166-1 alpha-2 country code (e.g. US) or one country flag emoji (e.g. 🇺🇸).',
        ),
      ];
    }
    const flag = String.fromCodePoint(
      REGIONAL_INDICATOR_BASE + code.charCodeAt(0) - 65,
      REGIONAL_INDICATOR_BASE + code.charCodeAt(1) - 65,
    );
    return [
      keyValueBox('keyValue', 'Country Flag', {
        Code: code,
        Flag: flag,
        Name: COUNTRY_NAMES.of(code) ?? code,
      }),
    ];
  },
};

export default CountryFlagBoxSource;
