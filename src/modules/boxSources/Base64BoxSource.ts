import { isBase64, isObject, isString, trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder } from '@modules/Box';
import init, { decode_to_string, encode } from 'base64-box';

// Base64 Encode can match almost all cases, so we need to set a lower priority
const PriorityBase64Encode = 0;

let initPromise: Promise<void> | null = null;

async function initBas64Box() {
  if (!initPromise) {
    initPromise = (async () => {
      const isNode =
        typeof process !== 'undefined' && process.versions?.node !== undefined;
      if (isNode) {
        // Node/Bun cannot fetch a file:// WASM asset. Keep native imports out
        // of the browser bundle, just as the math-box loader does.
        const fsName = 'node:fs/promises';
        const moduleName = 'node:module';
        const [fs, nodeModule] = await Promise.all([
          import(/* @vite-ignore */ fsName),
          import(/* @vite-ignore */ moduleName),
        ]);
        const req = nodeModule.createRequire(import.meta.url);
        const bytes = await fs.readFile(
          req.resolve('base64-box/base64_box_bg.wasm'),
        );
        await init({ module_or_path: bytes });
      } else {
        await init();
      }
    })().catch((error) => {
      initPromise = null;
      throw error;
    });
  }
  return initPromise;
}

interface Match {
  decodedText: string;
  languageOpts: BoxOptions;
}

export const Base64DecodeBoxSource = {
  name: 'Base64 Decode',
  description: 'Decode a Base64 encoded string back into readable text.',
  defaultInput: 'SGVsbG8gV29ybGQK', // Hello World
  tag: '◱',
  kind: 'Decode',
  priority: 10, // Default priority for Base64 Decode

  async checkMatch(
    input: string,
    options: BoxOptions = null,
  ): Promise<Match | undefined> {
    if (!isString(input)) {
      return undefined;
    }
    const regularInput = trim(input);

    if (!isBase64(regularInput)) {
      return undefined;
    }

    try {
      await initBas64Box();
      const decodedText = decode_to_string(regularInput);

      const languageOpts: BoxOptions = {};
      if (options && isObject(options)) {
        try {
          const langKeys = ['language', 'lang', 'l'];

          Object.keys(options).some((option) =>
            langKeys.some((langKey) => {
              if (option.startsWith(`${langKey}=`)) {
                languageOpts.language = option.substring(
                  0,
                  `${langKey}=`.length,
                );
                return true;
              }
              return false;
            }),
          );
        } catch {
          /* */
        }
      }

      return { decodedText, languageOpts };
    } catch {
      /* */
    }

    return undefined;
  },

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const match = await this.checkMatch(input, options);
    if (!match) {
      return [];
    }

    const { decodedText, languageOpts } = match;
    return [
      new BoxBuilder('Base64 decode', decodedText)
        .setOptions(languageOpts)
        .setView('code')
        .setShowExpandButton(true)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

interface EncodeMatch {
  encodedText: string;
}

export const Base64EncodeBoxSource = {
  name: 'Base64 Encode',
  description: 'Encode a string to Base64.',
  defaultInput: 'Hello World',
  tag: '◱',
  kind: 'Encode',
  priority: PriorityBase64Encode, // Lower priority since it matches almost everything

  async checkMatch(input: string): Promise<EncodeMatch | undefined> {
    if (!isString(input)) {
      return undefined;
    }
    if (input === '' || trim(input) === '') {
      return undefined;
    }

    await initBas64Box();
    const encodedText = encode(input);

    return { encodedText };
  },

  async generateBoxes(input: string): Promise<Box[]> {
    const match = await this.checkMatch(input);
    if (!match) {
      return [];
    }

    const { encodedText } = match;
    return [
      new BoxBuilder('Base64 Encode', encodedText)
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export const base64 = { Base64DecodeBoxSource, Base64EncodeBoxSource };
