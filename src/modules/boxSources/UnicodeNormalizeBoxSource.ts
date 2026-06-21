import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { isString } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// supported Unicode normalization forms
const FORMS = ['NFC', 'NFD', 'NFKC', 'NFKD'] as const;
type NormalizationForm = (typeof FORMS)[number];

function resolveForm(raw: string | boolean | null): NormalizationForm {
  if (
    typeof raw === 'string' &&
    (FORMS as readonly string[]).includes(raw.toUpperCase())
  ) {
    return raw.toUpperCase() as NormalizationForm;
  }
  return 'NFC';
}

export const UnicodeNormalizeBoxSource = {
  name: 'Unicode Normalize',
  description:
    'Normalize text to a Unicode form (NFC/NFD/NFKC/NFKD). ::normalize=nfc (default NFC).',
  defaultInput: 'café ::normalize=nfd',
  tag: '#',
  kind: 'Transform',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'normalize', 'unicodenormalize')) return [];
    if (!isString(input) || input.length === 0 || input.length > MAX_INPUT)
      return [];

    const raw = extractOptionKeys(options, 'normalize', 'unicodenormalize');
    const form = resolveForm(raw);
    const normalized = input.normalize(form);

    const kvOptions: Record<string, string> = {
      Form: form,
      Normalized: normalized,
      'Input Length': String(input.length),
      'Output Length': String(normalized.length),
      Changed: String(normalized !== input),
    };

    // plaintext k:v lines for headless/TUI consumers
    const plaintextOutput = Object.entries(kvOptions)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    return [
      new BoxBuilder('Unicode Normalize', plaintextOutput)
        .setOptions(kvOptions)
        .setTemplate(KeyValueBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default UnicodeNormalizeBoxSource;
