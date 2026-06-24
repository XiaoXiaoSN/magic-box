import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { isString, trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// apply the atbash substitution: A↔Z, B↔Y, ...; non-alpha chars pass through unchanged
function applyAtbash(input: string): string {
  let result = '';
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    if (code >= 65 && code <= 90) {
      // uppercase A-Z
      result += String.fromCharCode(90 - (code - 65));
    } else if (code >= 97 && code <= 122) {
      // lowercase a-z
      result += String.fromCharCode(122 - (code - 97));
    } else {
      result += input[i];
    }
  }
  return result;
}

export const AtbashBoxSource = {
  defaultDisabled: true,
  name: 'Atbash',
  description: 'Apply the Atbash cipher (A↔Z, B↔Y, ...). Self-inverse.',
  defaultInput: 'hello ::atbash',
  tag: '#',
  kind: 'Encode',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'atbash')) return [];
    if (
      !isString(input) ||
      trim(input).length === 0 ||
      input.length > MAX_INPUT
    )
      return [];

    const output = applyAtbash(input);

    const box = new BoxBuilder('Atbash', output)
      .setTemplate(DefaultBoxTemplate)
      .setShowExpandButton(false)
      .setPriority(this.priority)
      .build();

    return [box];
  },
};

export default AtbashBoxSource;
