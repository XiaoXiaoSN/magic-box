import { DefaultBoxTemplate } from '@components/BoxTemplate';
import crypto from '@functions/crypto';
import { BoxBuilder } from '@modules/Box';

import type { Box, BoxOptions } from '@modules/Box';

const PriorityUuidBox = 10;

type Match = boolean;

export const UuidBoxSource = {
  checkMatch(input: string): Match | undefined {
    // Match "uuid" or "UUID"
    const match = /^\s*uuid\s*$/i.exec(input);
    if (!match) {
      return undefined;
    }

    // If input is uppercase, return uppercase flag
    return true;
  },

  async generateBoxes(input: string, options: BoxOptions = null): Promise<Box[]> {
    const match = this.checkMatch(input);
    if (!match) {
      return [];
    }

    let uuid: string = crypto.crypto.randomUUID();
    if (options && (options.uppercase || options.upper)) {
      uuid = uuid.toUpperCase();
    }

    return [
      new BoxBuilder('UUID', uuid)
        .setTemplate(DefaultBoxTemplate)
        .setPriority(PriorityUuidBox)
        .build(),
    ];
  },
};

export default UuidBoxSource;
