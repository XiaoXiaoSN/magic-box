import { DiceRollBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys, hasOptionKeys } from '@modules/Box';

import { diceOptions, dicePlaintext, rollDice } from '@modules/dice';

const Priority = 10;

// bound the number of animated cubes and random samples per request
const MAX_COUNT = 20;

export const DiceRollBoxSource = {
  defaultDisabled: true,
  name: 'Dice Roll',
  description:
    'Roll six-sided dice. Specify a count from 1 to 20; defaults to 1. ::roll or ::dice=3.',
  defaultInput: '::roll',
  tag: '#',
  kind: 'Generate',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'roll', 'dice')) return [];

    const optionValue = extractOptionKeys(options, 'roll', 'dice');
    const raw =
      typeof optionValue === 'string' && optionValue.trim() !== ''
        ? optionValue.trim()
        : trim(input);
    const count = raw === '' ? 1 : Number(raw);

    if (
      (raw !== '' && !/^\d+$/.test(raw)) ||
      !Number.isInteger(count) ||
      count < 1 ||
      count > MAX_COUNT
    ) {
      return [
        new BoxBuilder(
          'Dice Roll',
          'Enter a dice count from 1 to 20, e.g. ::roll=3. Every die has six sides.',
        )
          .setShowExpandButton(false)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const kvOptions = diceOptions(rollDice(count));
    const plaintext = dicePlaintext(kvOptions);

    return [
      new BoxBuilder('Dice Roll', plaintext)
        .setTemplate(DiceRollBoxTemplate)
        .setShowExpandButton(false)
        .setOptions(kvOptions)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default DiceRollBoxSource;
