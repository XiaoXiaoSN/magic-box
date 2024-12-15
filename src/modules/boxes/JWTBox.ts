import { CodeBox } from '@components/Boxes';
import { isString, trim } from '@functions/helper';
import { Box, BoxBuilder } from '@modules/Box';
import { jwtDecode } from 'jwt-decode';

const PriorityJWT = 10;

interface Match {
  jwtStr: string,
}

export const JWTBoxSource = {
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
        .setComponent(CodeBox)
        .setPriority(PriorityJWT)
        .build(),
    ];
  },
};

export default JWTBoxSource;
