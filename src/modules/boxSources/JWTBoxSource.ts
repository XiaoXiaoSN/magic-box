import { jwtDecode } from 'jwt-decode';

import { CodeBoxTemplate } from '@components/BoxTemplate';
import { isString, trim } from '@functions/helper';
import { BoxBuilder } from '@modules/Box';

import type { Box } from '@modules/Box';

const PriorityJWT = 10;

interface Match {
  jwtStr: string,
}

export const JWTBoxSource = {
  name: 'JWT Decode',
  description: 'Decode a JSON Web Token.',
  defaultInput: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
  priority: PriorityJWT,

  checkMatch(input: string): Match | undefined {
    if (!isString(input)) {
      return undefined;
    }
    const regularInput = trim(input);

    try {
      const jwtHeader = jwtDecode(regularInput, { header: true });
      const jwtBody = jwtDecode(regularInput);
      const jwtStr = JSON.stringify({ header: jwtHeader, body: jwtBody }, null, '    ');

      return { jwtStr };
    } catch { /* */ }

    return undefined;
  },

  async generateBoxes(input: string): Promise<Box[]> {
    const match = this.checkMatch(input);
    if (!match) {
      return [];
    }

    const { jwtStr } = match;
    return [
      new BoxBuilder('JWT Decode', jwtStr)
        .setOptions({ language: 'json' })
        .setTemplate(CodeBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default JWTBoxSource;
