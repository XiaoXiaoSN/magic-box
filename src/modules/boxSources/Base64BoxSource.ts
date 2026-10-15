import {
  decodeUtf8Strict,
  formatBinaryFallback,
  normalizeBase64,
} from '@functions/base64';
import { isBase64, isString, trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys } from '@modules/Box';
import { loadRuntimeWasm } from './runtimeAssets';

// Base64 Encode can match almost all cases, so we need to set a lower priority
const PriorityBase64Encode = 0;
const MAX_INPUT = 100_000;

type Base64BoxModule = typeof import('base64-box');

let initPromise: Promise<Base64BoxModule> | null = null;

async function initBase64Box(): Promise<Base64BoxModule> {
  if (!initPromise) {
    initPromise = (async () => {
      const base64Box = await import('base64-box');
      const embeddedBytes = loadRuntimeWasm('base64');
      if (embeddedBytes) {
        await base64Box.default({ module_or_path: await embeddedBytes });
        return base64Box;
      }
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
        await base64Box.default({ module_or_path: bytes });
      } else {
        await base64Box.default();
      }
      return base64Box;
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
    if (input.length > MAX_INPUT) {
      return undefined;
    }
    const regularInput = trim(input);

    if (!isBase64(regularInput)) {
      return undefined;
    }

    try {
      const normalizedInput = normalizeBase64(regularInput);
      const base64Box = await initBase64Box();
      const decoded = base64Box.decode(normalizedInput);
      const decodedText =
        decodeUtf8Strict(decoded) ?? formatBinaryFallback(decoded);

      const languageOpts: BoxOptions = {};
      const language = extractOptionKeys(options, 'language', 'lang', 'l');
      if (typeof language === 'string') {
        languageOpts.language = language;
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
    if (input.length > MAX_INPUT) {
      return undefined;
    }
    if (input === '' || trim(input) === '') {
      return undefined;
    }

    try {
      const base64Box = await initBase64Box();
      return { encodedText: base64Box.encode(input) };
    } catch {
      return undefined;
    }
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
