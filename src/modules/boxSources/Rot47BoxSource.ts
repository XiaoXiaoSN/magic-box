import { isString } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// rotate each printable ASCII character (33-126) by 47 positions within that range
function rot47(input: string): string {
  let result = '';
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    if (code >= 33 && code <= 126) {
      result += String.fromCharCode(33 + ((code - 33 + 47) % 94));
    } else {
      result += input[i];
    }
  }
  return result;
}

export const Rot47BoxSource = {
  name: 'ROT47',
  description:
    'Apply the ROT47 cipher (rotate printable ASCII 33-126 by 47). Self-inverse.',
  defaultInput: 'Hello, World! ::rot47',
  tag: '#',
  kind: 'Encode',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'rot47')) return [];
    if (!isString(input) || input.length === 0 || input.length > MAX_INPUT)
      return [];

    const output = rot47(input);

    return [
      new BoxBuilder('ROT47', output)
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default Rot47BoxSource;
