import { CodeBoxTemplate } from '@components/BoxTemplate';
import {
  isBase64, isObject, isString, trim,
} from '@functions/helper';
import { Box, BoxBuilder, BoxOptions } from '@modules/Box';
import init, * as Base64 from 'base64-box';

// Base64 Encode can match almost all cases, so we need to set a lower priority
const PriorityBase64Encode = 0;

let isInitialized = false;

async function initBas64Box() {
  if (!isInitialized) {
    await init();
    isInitialized = true;
  }
}

interface Match {
  decodedText: string,
  languageOpts: BoxOptions,
}

export const Base64DecodeBoxSource = {
  async checkMatch(input: string, options: BoxOptions = null): Promise<Match | undefined> {
    if (!isString(input)) {
      return undefined;
    }
    const regularInput = trim(input);

    if (!isBase64(regularInput)) {
      return undefined;
    }

    try {
      await initBas64Box();
      const decodedText = Base64.decode_to_string(regularInput);

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

  async generateBoxes(input: string, options: BoxOptions = null): Promise<Box[]> {
    const match = await this.checkMatch(input, options);
    if (!match) {
      return [];
    }

    const { decodedText, languageOpts } = match;
    return [
      new BoxBuilder('Base64 decode', decodedText)
        .setOptions(languageOpts)
        .setTemplate(CodeBoxTemplate)
        .build(),
    ];
  },
};

interface EncodeMatch {
  encodedText: string,
}

export const Base64EncodeBoxSource = {
  async checkMatch(input: string): Promise<EncodeMatch | undefined> {
    if (!isString(input)) {
      return undefined;
    }
    if (input === '' || trim(input) === '') {
      return undefined;
    }

    await initBas64Box();
    const encodedText = Base64.encode(input);

    return { encodedText };
  },

  async generateBoxes(input: string): Promise<Box[]> {
    const match = await this.checkMatch(input);
    if (!match) {
      return [];
    }

    const { encodedText } = match;
    return [
      new BoxBuilder('Base64 encode', encodedText)
        .setPriority(PriorityBase64Encode)
        .build(),
    ];
  },
};

export const base64 = { Base64DecodeBoxSource, Base64EncodeBoxSource };
