import { CodeBox } from '@components/Boxes';
import Base64 from '@functions/base64';
import {
  isBase64, isObject, isString, trim,
} from '@functions/helper';
import { Box, BoxBuilder, BoxOptions } from '@modules/Box';

interface Match {
  decodedText: string,
  languageOpts: BoxOptions,
}

export const Base64DecodeBoxSource = {
  checkMatch(input: string, options: BoxOptions | null): Match | undefined {
    if (!isString(input)) {
      return undefined;
    }
    const regularInput = trim(input);

    if (!isBase64(regularInput)) {
      return undefined;
    }

    try {
      const decodedText = Base64.decode(regularInput);

      const languageOpts: BoxOptions = {};
      if (options && isObject(options)) {
        try {
          const langKeys = ['language', 'lang', 'l'];

          Object.keys(options).some((option) => langKeys.some((langKey) => {
            if (option.indexOf(`${langKey}=`) === 0) {
              languageOpts.language = option.substring(0, (`${langKey}=`).length);
              return true;
            }
            return false;
          }));
        } catch { /* */ }
      }

      return { decodedText, languageOpts };
    } catch { /* */ }

    return undefined;
  },

  async generateBoxes(input: string, options: BoxOptions | null): Promise<Box[]> {
    const match = this.checkMatch(input, options);
    if (!match) {
      return [];
    }

    const { decodedText, languageOpts } = match;
    return [
      new BoxBuilder('Base64 decode', decodedText)
        .setOptions(languageOpts)
        .setComponent(CodeBox)
        .build(),
    ];
  },
};

interface EncodeMatch {
  encodedText: string,
}

export const Base64EncodeBoxSource = {
  checkMatch(input: string): EncodeMatch | undefined {
    if (!isString(input)) {
      return undefined;
    }
    if (input === '' || trim(input) === '') {
      return undefined;
    }

    const encodedText = Base64.encode(input);

    return { encodedText };
  },

  async generateBoxes(input: string): Promise<Box[]> {
    const match = this.checkMatch(input);
    if (!match) {
      return [];
    }

    const { encodedText } = match;
    return [
      new BoxBuilder('Base64 encode', encodedText).build(),
    ];
  },
};

export default { Base64DecodeBoxSource, Base64EncodeBoxSource };
