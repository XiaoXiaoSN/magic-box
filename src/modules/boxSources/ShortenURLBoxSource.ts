import { isString, trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys } from '@modules/Box';
import type { BoxSourceContext } from '@modules/BoxSource';

import { isHttpUrl, requestShortenURL } from './shortenURL';

const PriorityShortenURL = 10;

interface Match {
  shortenURL: string;
}

export const ShortenURLBoxSource = {
  name: 'Shorten URL',
  description: 'Generate a short URL with an optional custom alias.',
  defaultInput: `https://github.com/XiaoXiaoSN/magic-box
::surl
`,
  tag: '↗',
  kind: 'Transform',
  priority: PriorityShortenURL,

  async getShortenURL(
    inputURL: string,
    shorten: string | null,
    signal?: AbortSignal,
  ): Promise<string> {
    return requestShortenURL(inputURL, shorten, signal);
  },

  async checkMatch(
    input: string,
    options: BoxOptions,
  ): Promise<Match | undefined> {
    if (options === null) {
      return undefined;
    }

    let shortenOption = extractOptionKeys(options, 'surl', 'shorten');
    if (shortenOption === null) {
      return undefined;
    }
    // contains the option key, but the value is empty
    if (typeof shortenOption === 'boolean') {
      shortenOption = null;
    }

    if (!isString(input)) {
      return undefined;
    }
    if (input === '' || trim(input) === '') {
      return undefined;
    }

    const regularInput = trim(input);

    if (!isHttpUrl(regularInput)) return undefined;
    return { shortenURL: regularInput };
  },

  async generateBoxes(
    input: string,
    options: BoxOptions,
    context?: BoxSourceContext,
  ): Promise<Box[]> {
    const match = await this.checkMatch(input, options);
    if (!match) {
      return [];
    }

    const { shortenURL } = match;
    return [
      new BoxBuilder('Shorten URL', shortenURL)
        .setSourceInput(shortenURL)
        .setOptions({
          ...(options ?? {}),
          preview: context?.preview === true,
        })
        .setView('shortenURL')
        .setShowExpandButton(false)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default ShortenURLBoxSource;
